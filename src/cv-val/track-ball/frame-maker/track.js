import { CanvasRenderer } from "../../canvas-renderer.js";
import { BallFrameMakerBase } from "./ball-frame-maker-base.js";

export class TrackFrameMaker extends BallFrameMakerBase {
    constructor() {
        super();
        this.trackData = null;
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCtx = this.offscreenCanvas.getContext('2d');
        this.renderer = new CanvasRenderer();

        // --- 설정 옵션 ---
        this.trailColor = 'red';
        this.boxColor = 'blue';
        this.showConfidence = true;
        this.trailWidth = 5;
        this.lastDrawIdx = 0;
    }

    setOptions({ trailWidth }) {
        if (trailWidth !== undefined) this.trailWidth = trailWidth;
    }

    bindUI(box) {
        const canvas = box.querySelectorAll('canvas')[0];
        this.renderer.setCanvas(canvas);

        const confCheckbox = box.querySelectorAll(".show-conf")[0];
        confCheckbox.addEventListener('change', (e) => {
            this.showConfidence = e.target.checked;
            this.drawImageAt(this.lastDrawIdx);
        });

        const boxPicker = box.querySelectorAll(".box-color")[0];
        boxPicker.addEventListener('change', (e) => {
            this.boxColor = e.target.value;
            this.drawImageAt(this.lastDrawIdx);
        });

        const trailPicker = box.querySelectorAll(".trail-color")[0];
        trailPicker.addEventListener('input', (e) => {
            this.trailColor = e.target.value;
            this.drawImageAt(this.lastDrawIdx);
        });
    }

    setBallData(trackData) {
        this.trackData = trackData;
        if (trackData == null) return;
        const image = this.trackData.getRawImgList(0)[0];
        if (image) {
            this.renderer.updateLayout(image.width, image.height);
            this.offscreenCanvas.width = image.width;
            this.offscreenCanvas.height = image.height;
        }
    }

    getBall(idx) {
        if (!this.trackData || idx < 0) return null;
        return this.trackData.getSelectedBallAt(idx);
    }

    /**
     * [핵심 변경] 배경 이미지 + 볼 궤적 + 바운딩 박스가 모두 합성된 캔버스를 반환합니다.
     */
    getImageAt(idx) {
        if (!this.trackData || idx < 0) return null;

        const image = this.trackData.getRawImgList(0)[idx];
        if (!image) return null;

        const ctx = this.offscreenCtx;
        const { width, height } = this.offscreenCanvas;

        // 1. 초기화 및 배경 이미지 그리기
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(image, 0, 0, width, height);

        const ballList = this.trackData.getBallList();
        if (!ballList) return this.offscreenCanvas;

        // 2. 궤적(Trail) 그리기
        ctx.beginPath();
        ctx.strokeStyle = this.trailColor;
        ctx.lineWidth = this.trailWidth;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        let isDrawing = false;
        for (let i = 0; i <= idx; i++) {
            const ball = this.getBall(i);
            if (ball) {
                const x = ball.bbox[0] + ball.bbox[2] / 2;
                const y = ball.bbox[1] + ball.bbox[3] / 2;
                if (!isDrawing) {
                    ctx.moveTo(x, y);
                    isDrawing = true;
                } else {
                    ctx.lineTo(x, y);
                }
            } else if (isDrawing) {
                ctx.stroke();
                ctx.beginPath();
                isDrawing = false;
            }
        }
        ctx.stroke();

        // 3. 현재 프레임의 객체 강조 (Box + Confidence)
        const nowBall = this.getBall(idx);
        if (nowBall) {
            const [bx, by, bw, bh] = nowBall.bbox;

            // 바운딩 박스
            ctx.strokeStyle = this.boxColor;
            ctx.lineWidth = 3;
            ctx.strokeRect(bx, by, bw, bh);

            // 신뢰도 표시
            if (this.showConfidence) {
                ctx.fillStyle = 'white';
                ctx.font = 'bold 30px Arial';
                ctx.shadowColor = 'black';
                ctx.shadowBlur = 4;
                ctx.fillText(`Conf: ${nowBall.confidence.toFixed(2)}`, bx, by - 10);
                ctx.shadowBlur = 0;
            }
        }

        return this.offscreenCanvas;
    }
    
    drawImageAt(idx) {
        this.lastDrawIdx = idx;
        const compositeImage = this.getImageAt(idx);

        if (compositeImage) {
            // 이제 renderer는 별도의 레이어 구분 없이 결과물을 그립니다.
            this.renderer.drawImage(compositeImage);
        }
    }
}