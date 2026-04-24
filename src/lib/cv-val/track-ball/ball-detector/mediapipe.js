import { ObjectDetector, FilesetResolver } from "@mediapipe/tasks-vision";

export class MediaPipeBallDetector {
    constructor(modelPath, targetClassId = 32) {
        this.modelPath = modelPath;
        this.detector = undefined;
        this.frameIdx = 0;
        this.threshold = 0;

        // 스포츠 공 인식을 위한 추적 설정 (YOLOLiveBallDetector 로직 이식)
        this.targetClassId = targetClassId; // COCO 모델 기준 sports ball은 32
        this.prevCandidates = [];
        this.trackingWeight = 0.35;
    }

    async initialize() {
        console.log("MediaPipe Ball Detector 초기화 중...");
        try {
            const vision = await FilesetResolver.forVisionTasks(
                "./external/models/mediapipe/wasm"
            );

            this.detector = await ObjectDetector.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: this.modelPath,
                    delegate: "GPU",
                },
                scoreThreshold: this.threshold,
                runningMode: "VIDEO",
            });
        } catch (error) {
            console.error("ObjectDetector 초기화 실패:", error);
        }
    }

    /**
     * @param {ImageBitmap} image - 입력 이미지
     */
    async process(image) {
        if (!this.detector) {
            console.error("Detector가 초기화되지 않았습니다.");
            return null;
        }

        const width = image.width;
        const height = image.height;
        const maxDiagonal = Math.sqrt(Math.pow(width, 2) + Math.pow(height, 2));

        // 1. 타임스탬프를 performance.now()로 변경 (ms 단위 권장)
        const timestamp = performance.now();
        const result = await this.detector.detectForVideo(image, timestamp);

        if (!result.detections || result.detections.length === 0) {
            return null;
        }

        const currentCandidates = [];

        for (const detection of result.detections) {
            if (!detection.categories || detection.categories.length === 0) continue;
            const category = detection.categories[0];
            
            // 1. 공(targetClassId)만 필터링
            if (category.index !== this.targetClassId) continue;

            const { originX, originY, width: boxW, height: boxH } = detection.boundingBox;
            let finalScore = category.score;

            // 2. 이전 프레임 위치 기반 가중치 계산 (추적 안정성)
            if (this.prevCandidates.length > 0) {
                let maxBonus = 0;
                const currCenterX = originX + boxW / 2;
                const currCenterY = originY + boxH / 2;

                for (const prev of this.prevCandidates) {
                    const prevCenterX = prev.bbox[0] + prev.bbox[2] / 2;
                    const prevCenterY = prev.bbox[1] + prev.bbox[3] / 2;
                    const distance = Math.sqrt(Math.pow(currCenterX - prevCenterX, 2) + Math.pow(currCenterY - prevCenterY, 2));
                    const proximity = Math.max(0, 1 - (distance / (maxDiagonal * 0.15)));
                    const bonus = proximity * prev.confidence * this.trackingWeight;
                    if (bonus > maxBonus) maxBonus = bonus;
                }
                finalScore += maxBonus;
            }

            const candidate = {
                bbox: [originX, originY, boxW, boxH],
                confidence: category.score,
                finalScore: finalScore,
                classId: category.index,
                label: category.categoryName
            };

            currentCandidates.push(candidate);
        }

        // 상위 5개 후보군 정렬 및 반환
        const sortedCandidates = currentCandidates.sort((a, b) => b.finalScore - a.finalScore).slice(0, 5);
        this.prevCandidates = sortedCandidates;

        return sortedCandidates;
    }
}