import * as tf from '@tensorflow/tfjs';
import { DetectedObject } from '../../types';

export type ImageSource = HTMLCanvasElement | HTMLImageElement | HTMLVideoElement | ImageBitmap | OffscreenCanvas;

export class YOLOBallDetector {
    private weightURL: string;
    private offscreenCanvas: HTMLCanvasElement;
    private classId: number;
    private threshold: number;
    private detector: tf.GraphModel | null = null;

    constructor(weightURL: string, classId: number) {
        this.weightURL = weightURL;
        this.offscreenCanvas = document.createElement('canvas');
        this.classId = classId;
        this.threshold = 0.25; // 최소 신뢰도 기준 추가
    }

    async initialize(): Promise<void> {
        await tf.setBackend('webgl');
        await tf.ready();
        this.detector = await tf.loadGraphModel(this.weightURL);
    }

    async process(imageSource: ImageSource): Promise<DetectedObject[]> {
        if (!this.detector) {
            throw new Error("Detector not initialized. Call initialize() first.");
        }

        const inputTensor = await this.preProcess(imageSource);

        const resizedTensor = tf.tidy(() => {
            return tf.image.resizeBilinear(inputTensor, [640, 640])
                .div(255.0)
                .expandDims(0) as tf.Tensor4D;
        });

        const predictions = await this.detector.execute(resizedTensor);
        
        const width = (imageSource as any).width || (imageSource as any).videoWidth;
        const height = (imageSource as any).height || (imageSource as any).videoHeight;

        const detectedObjects = await this.postProcess(
            predictions, 
            width,
            height
        );

        inputTensor.dispose();
        resizedTensor.dispose();
        if (Array.isArray(predictions)) {
            predictions.forEach(p => p.dispose());
        } else {
            predictions.dispose();
        }

        return detectedObjects; // 이제 배열을 반환합니다.
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
        ctx.drawImage(imageSource as CanvasImageSource, 0, 0, width, height);
        
        return tf.browser.fromPixels(this.offscreenCanvas);
    }

    private async postProcess(
        predictions: tf.Tensor | tf.Tensor[], 
        originalWidth: number, 
        originalHeight: number
    ): Promise<DetectedObject[]> {
        const outputTensor = Array.isArray(predictions) ? predictions[0] : predictions;
        const originalSize = Math.max(originalWidth, originalHeight);
        const scale = originalSize / 640;

        const transposedTensor = tf.transpose(outputTensor, [0, 2, 1]);
        const detections = await transposedTensor.array() as number[][][];

        const candidates: DetectedObject[] = []; 
        const classIdToFilter = this.classId;
        const [allDetections] = detections;

        for (const detection of allDetections) {
            const [x, y, width, height, ...classProbs] = detection;
            const maxProb = Math.max(...classProbs);
            const classId = classProbs.indexOf(maxProb);

            if (classId === classIdToFilter) {
                // 1. 좌표 계산: YOLO 중심점 -> 좌상단 변환
                let x1 = (x - width / 2) * scale;
                let y1 = (y - height / 2) * scale;
                let w = width * scale;
                let h = height * scale;

                // 2. 바운딩 박스 클리핑 (영상 밖으로 나가지 않도록 보정)
                x1 = Math.max(0, Math.min(x1, originalWidth));
                y1 = Math.max(0, Math.min(y1, originalHeight));
                w = Math.min(w, originalWidth - x1);
                h = Math.min(h, originalHeight - y1);

                // 유효한 크기를 가진 박스만 추가
                if (w > 0 && h > 0) {
                    candidates.push({
                        bbox: [x1, y1, w, h],
                        confidence: maxProb,
                        classId: classId
                    });
                }
            }
        }

        // 3. 신뢰도 순 정렬 후 가장 높은 5개만 반환
        candidates.sort((a, b) => b.confidence - a.confidence);
        
        transposedTensor.dispose();
        
        return candidates.slice(0, 5);
    }
}