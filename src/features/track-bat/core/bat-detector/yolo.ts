import * as tf from '@tensorflow/tfjs';
import { BatDetectedObject, ImageSource } from '../../types';

export class YOLOBatDetector {
    private weightURL: string;
    private offscreenCanvas: HTMLCanvasElement;
    private inputSize: number;
    private batClassId: number;
    private topK: number;
    private detector: tf.GraphModel | null = null;

    constructor(weightURL: string, classId: number, topK: number = 5) {
        this.weightURL = weightURL;
        this.offscreenCanvas = document.createElement('canvas');
        this.inputSize = 640;
        this.batClassId = classId;
        this.topK = topK;
    }

    async initialize(): Promise<void> {
        await tf.setBackend('webgl');
        await tf.ready();
        this.detector = await tf.loadGraphModel(this.weightURL);
    }

    async process(imageSource: ImageSource): Promise<BatDetectedObject[]> {
        if (!this.detector) {
            throw new Error("Detector not initialized. Call initialize() first.");
        }

        const width = (imageSource as any).width || (imageSource as any).videoWidth;
        const height = (imageSource as any).height || (imageSource as any).videoHeight;

        const inputTensor = await this.preProcess(imageSource);
        const resizedTensor = tf.tidy(() => {
            return tf.image.resizeBilinear(inputTensor, [this.inputSize, this.inputSize])
                .div(255.0)
                .expandDims(0) as tf.Tensor4D;
        });

        // executeAsync 대신 execute 사용 (경고 메시지 해결)
        const predictions = this.detector.execute(resizedTensor) as tf.Tensor[];
        const candidates = await this.postProcess(predictions, width, height);

        inputTensor.dispose();
        resizedTensor.dispose();
        predictions.forEach((p: tf.Tensor) => p.dispose());

        return candidates;
    }

    private async preProcess(imageSource: ImageSource): Promise<tf.Tensor3D> {
        const width = (imageSource as any).width || (imageSource as any).videoWidth;
        const height = (imageSource as any).height || (imageSource as any).videoHeight;
        const size = Math.max(width, height);
        const ctx = this.offscreenCanvas.getContext('2d');

        if (!ctx) throw new Error("Failed to get 2D context");

        this.offscreenCanvas.width = size;
        this.offscreenCanvas.height = size;

        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, size, size);
        const xOffset = (size - width) / 2;
        const yOffset = (size - height) / 2;
        ctx.drawImage(imageSource as CanvasImageSource, xOffset, yOffset, width, height);

        return tf.browser.fromPixels(this.offscreenCanvas);
    }

    private async postProcess(predictions: tf.Tensor[], originalWidth: number, originalHeight: number): Promise<BatDetectedObject[]> {
        const [output0, proto] = predictions;
        const originalSize = Math.max(originalWidth, originalHeight);

        // 1. 박스 및 스코어 추출
        const [nmsBoxes, batScores, maskCoeffs] = tf.tidy(() => {
            const transposed = output0.squeeze().transpose([1, 0]); // [8400, 116]

            const rawBoxes = transposed.slice([0, 0], [-1, 4]);
            const xCenter = rawBoxes.slice([0, 0], [-1, 1]);
            const yCenter = rawBoxes.slice([0, 1], [-1, 1]);
            const width = rawBoxes.slice([0, 2], [-1, 1]);
            const height = rawBoxes.slice([0, 3], [-1, 1]);

            // NMS용 [y1, x1, y2, x2] 형식 (0~1 scale)
            const y1 = yCenter.sub(height.div(2)).div(this.inputSize) as tf.Tensor1D;
            const x1 = xCenter.sub(width.div(2)).div(this.inputSize) as tf.Tensor1D;
            const y2 = yCenter.add(height.div(2)).div(this.inputSize) as tf.Tensor1D;
            const x2 = xCenter.add(width.div(2)).div(this.inputSize) as tf.Tensor1D;

            const boxes = tf.concat([y1, x1, y2, x2], 1);
            const scores = transposed.slice([0, 4 + this.batClassId], [-1, 1]).squeeze() as tf.Tensor1D;
            const coeffs = transposed.slice([0, 84], [-1, 32]) as tf.Tensor2D;

            return [boxes, scores, coeffs];
        });

        // 2. NMS로 중복 마스크 제거
        const selectedIndices = await tf.image.nonMaxSuppressionAsync(
            nmsBoxes as unknown as tf.Tensor2D, batScores as tf.Tensor1D, this.topK, 0.45, 0.25
        );
        const indices = await selectedIndices.data() as Uint8Array;

        const candidates: BatDetectedObject[] = [];
        for (const idx of indices) {
            const cand = tf.tidy(() => {
                const conf = (batScores.gather(idx) as unknown as tf.Tensor<tf.Rank.R0>).dataSync()[0];
                const box = (nmsBoxes.gather(idx) as tf.Tensor1D).dataSync();
                const coeff = (maskCoeffs.gather(idx) as unknown as tf.Tensor1D).expandDims(0) as tf.Tensor2D;

                // 마스크 생성
                const rawMask = this.generateConfidenceMap(proto as tf.Tensor3D, coeff);

                // 마스크 크롭 및 보정
                const mScale = 160 / 640;
                const mx1 = box[1] * 640 * mScale;
                const my1 = box[0] * 640 * mScale;
                const mx2 = box[3] * 640 * mScale;
                const my2 = box[2] * 640 * mScale;

                const croppedMask = this._cropMask(rawMask, mx1, my1, mx2, my2, originalWidth, originalHeight, originalSize);

                // 원본 좌표계 BBox
                const xOffset = (originalSize - originalWidth) / 2;
                const yOffset = (originalSize - originalHeight) / 2;
                const bbox: [number, number, number, number] = [
                    box[1] * originalSize - xOffset,
                    box[0] * originalSize - yOffset,
                    (box[3] - box[1]) * originalSize, // width
                    (box[2] - box[0]) * originalSize
                ];

                return { bbox, confidence: conf, maskConfidenceMap: croppedMask };
            });
            candidates.push(cand);
        }

        nmsBoxes.dispose();
        batScores.dispose();
        maskCoeffs.dispose();
        selectedIndices.dispose();

        return candidates;
    }

    private generateConfidenceMap(proto: tf.Tensor3D, coeffs: tf.Tensor2D): number[][] {
        return tf.tidy(() => {
            let p = proto.squeeze();
            // Assuming proto is [1, 32, 160, 160] or [32, 160, 160]
            // Need to reshape to [H*W, C] for matMul
            if (p.shape.length === 3 && p.shape[0] === 32) { // [C, H, W]
                p = p.transpose([1, 2, 0]); // [H, W, C]
            } else if (p.shape.length === 4 && p.shape[1] === 32) { // [1, C, H, W]
                p = p.squeeze([0]).transpose([1, 2, 0]); // [H, W, C]
            }
            const [h, w, c] = p.shape;
            const proto2D = p.reshape([h * w, c]); // [H*W, C]

            let mask = tf.matMul(coeffs, proto2D, false, true); // coeffs [1, C], proto2D [H*W, C] -> matMul [1, H*W]
            return (mask.reshape([h, w]).sigmoid()).arraySync() as number[][];
        });
    }

    /**
     * 보조 함수: 마스크를 BBox 영역에 맞춰 자르고 레터박스를 제거합니다.
     */
    private _cropMask(rawMask: number[][], mx1: number, my1: number, mx2: number, my2: number, originalWidth: number, originalHeight: number, originalSize: number): number[][] {
        const xStart = Math.round(((originalSize - originalWidth) / 2) * (160 / originalSize));
        const yStart = Math.round(((originalSize - originalHeight) / 2) * (160 / originalSize));
        const mWidth = Math.round(originalWidth * (160 / originalSize));
        const mHeight = Math.round(originalHeight * (160 / originalSize));

        const cropped = [];
        for (let j = 0; j < mHeight; j++) {
            const y = yStart + j;
            const row = [];
            for (let i = 0; i < mWidth; i++) {
                const x = xStart + i;
                let val: number = 0;
                // Note: mx1, my1, mx2, my2 are already scaled to maskOutputSize
                // BBox 범위 안에 있을 때만 마스크 값 유지
                if (rawMask[y] && x >= mx1 && x <= mx2 && y >= my1 && y <= my2) {
                    val = rawMask[y][x];
                }
                row.push(val);
            }
            cropped.push(row);
        }
        return cropped;
    }
}