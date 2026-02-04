import { CanvasRenderer } from "../../canvas-renderer.js";

export class TrackFrameMaker {
    constructor() {
        this.trackData = null;
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCtx = this.offscreenCanvas.getContext('2d');
        this.renderer = new CanvasRenderer();

        // --- 설정 옵션 추가 ---
        this.trailColor = 'red';      // 궤적 색상
        this.boxColor = 'blue';       // 바운딩 박스 색상
        this.showConfidence = true;    // 신뢰도 표시 여부
        this.trailWidth = 5;          // 궤적 두께
    }

    // 옵션 설정을 위한 메서드
    setOptions({ trailColor, boxColor, showConfidence, trailWidth }) {
        if (trailColor !== undefined) this.trailColor = trailColor;
        if (boxColor !== undefined) this.boxColor = boxColor;
        if (showConfidence !== undefined) this.showConfidence = showConfidence;
        if (trailWidth !== undefined) this.trailWidth = trailWidth;
    }

    setInstance(instance) { this.renderer.setCanvas(instance); }
    
    setData(trackData) {
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

    _generateBallLayer(idx) {
        const ctx = this.offscreenCtx;
        ctx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);

        const ballList = this.trackData.getBallList();
        if (!ballList) return null;

        // 1. 궤적 그리기
        ctx.beginPath();
        ctx.strokeStyle = this.trailColor; // 설정된 색상 사용
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
            } else {
                if (isDrawing) {
                    ctx.stroke();
                    ctx.beginPath();
                    isDrawing = false;
                }
            }
        }
        ctx.stroke();

        // 2. 현재 프레임 정보 (박스 + 선택적 텍스트)
        const nowBall = this.getBall(idx);
        if (nowBall) {
            const [bx, by, bw, bh] = nowBall.bbox;

            // 바운딩 박스
            ctx.strokeStyle = this.boxColor; // 설정된 색상 사용
            ctx.lineWidth = 3;
            ctx.strokeRect(bx, by, bw, bh);

            // 신뢰도 텍스트 출력 옵션 체크
            if (this.showConfidence) {
                const confidence = nowBall.confidence;
                ctx.fillStyle = 'white';
                ctx.font = 'bold 30px Arial';
                ctx.shadowColor = 'black';
                ctx.shadowBlur = 4;
                ctx.fillText(`Conf: ${confidence.toFixed(2)}`, bx, by - 10);
                ctx.shadowBlur = 0;
            }
        }

        return this.offscreenCanvas;
    }

    drawImageAt(idx) {
        if (!this.trackData || idx < 0) return;
        const image = this.trackData.getRawImgList(0)[idx];
        if (!image) return;

        this.renderer.drawImage(image);

        const ballLayer = this._generateBallLayer(idx);
        if (ballLayer) {
            this.renderer.drawLayer(ballLayer);
        }
    }
}