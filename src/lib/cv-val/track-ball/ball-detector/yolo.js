import * as tf from 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/+esm'

export class YOLOBallDetector {
    constructor(weightURL, classId) {
        this.weightURL = weightURL;
        this.offscreenCanvas = document.createElement('canvas');
        this.classId = classId;
        this.threshold = 0.25; // 최소 신뢰도 기준 추가
    }

    async initialize() {
        await tf.setBackend('webgl');
        await tf.ready();
        this.detector = await tf.loadGraphModel(this.weightURL);
    }

    async process(imageSource) {
        const inputTensor = await this.preProcess(imageSource);

        const resizedTensor = tf.tidy(() => {
            return tf.image.resizeBilinear(inputTensor, [640, 640])
                .div(255.0)
                .expandDims(0);
        });

        const predictions = await this.detector.execute(resizedTensor);
        
        const detectedObjects = await this.postProcess(
            predictions, 
            imageSource.width || imageSource.videoWidth, 
            imageSource.height || imageSource.videoHeight
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

    async preProcess(imageSource) {
        const width = imageSource.width || imageSource.videoWidth;
        const height = imageSource.height || imageSource.videoHeight;
        const size = Math.max(width, height);
        const ctx = this.offscreenCanvas.getContext('2d');

        this.offscreenCanvas.width = size;
        this.offscreenCanvas.height = size;
        
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(imageSource, 0, 0, width, height);
        
        return tf.browser.fromPixels(this.offscreenCanvas);
    }

    
    async postProcess(predictions, originalWidth, originalHeight) {
        const outputTensor = predictions;
        const originalSize = Math.max(originalWidth, originalHeight);
        const scale = originalSize / 640;

        const transposedTensor = tf.transpose(outputTensor, [0, 2, 1]);
        const detections = await transposedTensor.array();

        let candidates = []; 
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
                // 좌표가 음수이거나 영상 크기를 초과하면 화면에 보이지 않는 문제를 해결합니다.
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