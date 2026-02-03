class CanvasRenderer {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.layout = null;
        this.sourceW = 0;
        this.sourceH = 0;
    }

    setCanvas(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
    }

    updateLayout(sourceW, sourceH) {
        if (!this.canvas) return;
        this.sourceW = sourceW;
        this.sourceH = sourceH;

        const targetW = this.canvas.width;
        const targetH = this.canvas.height;
        const sourceAspect = sourceW / sourceH;
        const targetAspect = targetW / targetH;

        let drawW, drawH, x, y;

        if (sourceAspect > targetAspect) {
            drawW = targetW;
            drawH = targetW / sourceAspect;
            x = 0;
            y = (targetH - drawH) / 2;
        } else {
            drawH = targetH;
            drawW = targetH * sourceAspect;
            x = (targetW - drawW) / 2;
            y = 0;
        }

        this.layout = { 
            x: Math.floor(x), 
            y: Math.floor(y), 
            width: Math.floor(drawW), 
            height: Math.floor(drawH) 
        };

    }

    drawImage(source) {
        if (!this.canvas || !source) return;

        // --- 해상도 맞춤(DPR 반영) 코드 시작 ---
        const dpr = 1;
        const currentRatio = this.canvas.height / this.canvas.width;
        
        // CSS 상의 실제 노출 크기
        const displayW = this.canvas.clientWidth;
        const displayH = this.canvas.clientHeight || Math.floor(displayW * (isNaN(currentRatio) ? 0.5 : currentRatio));

        // 캔버스의 내부 해상도를 (디스플레이 크기 * DPR)로 설정
        if (displayW > 0 && (this.canvas.width !== Math.floor(displayW * dpr) || this.canvas.height !== Math.floor(displayH * dpr))) {
            this.canvas.width = Math.floor(displayW * dpr);
            this.canvas.height = Math.floor(displayH * dpr);
            
            // 컨텍스트의 스케일을 조정하여 그리기 명령이 자동으로 DPR에 맞춰지게 함
            this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            if (this.sourceW && this.sourceH) {
                this.updateLayout(this.sourceW, this.sourceH);
            }
        }
        // --- 해상도 맞춤 코드 끝 ---

        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';

        // 배경색 채우기 (내부 해상도가 dpr배 되었으므로 좌표/크기 계산 주의)
        // setTransform을 썼으므로 소스 코드 상의 수치(displayW, displayH)를 그대로 사용
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, displayW, displayH);

        if (this.layout) {
            // layout 수치는 이미 dpr이 곱해진 canvas.width 기준이므로 
            // setTransform 영향을 받지 않도록 일시적으로 리셋하거나 계산을 맞춰야 합니다.
            // 여기서는 가장 간단하게 원본 크기로 레이아웃을 다시 잡아 그립니다.
            const drawX = this.layout.x / dpr;
            const drawY = this.layout.y / dpr;
            const drawW = this.layout.width / dpr;
            const drawH = this.layout.height / dpr;

            this.ctx.drawImage(source, drawX, drawY, drawW, drawH);
        }
    }

    drawLayer(source) {
        if (!this.ctx || !source || !this.layout) return;
        const dpr = 1;
        this.ctx.imageSmoothingEnabled = true;
        
        // drawImage와 동일하게 스케일링 보정
        this.ctx.drawImage(
            source, 
            this.layout.x / dpr, 
            this.layout.y / dpr, 
            this.layout.width / dpr, 
            this.layout.height / dpr
        );
    }
}

export { CanvasRenderer }