import { Renderer } from './renderer-interface.js';

class WebCanvasRenderer extends Renderer {
    constructor() {
        super(); // Renderer 추상 클래스의 생성자 호출
        this.canvas = null;
        this.ctx = null;
        this.sourceW = 0;
        this.sourceH = 0;
        this.layout = null;
    }

    /** @param {HTMLCanvasElement} canvas */
    setCanvas(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
    }

    // 핵심: 캔버스의 현재 실제 크기를 기준으로 레이아웃을 다시 계산합니다.
    updateLayout(sourceW, sourceH) {
        if (!this.canvas || sourceW === 0 || sourceH === 0) return;
        
        this.sourceW = sourceW;
        this.sourceH = sourceH;

        // CSS에 의해 결정된 실제 캔버스 해상도 사용
        const targetW = this.canvas.width;
        const targetH = this.canvas.height;

        const sourceAspect = sourceW / sourceH;
        const targetAspect = targetW / targetH;

        let drawW, drawH, x, y;

        // Letterbox (검은 여백) 방식 계산
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

    /** @param {CanvasImageSource} source */
    drawImage(source) {
        if (!this.canvas || !source) return;
        
        const ctx = this.ctx;

        // 1. 외부(RGL 등)에서 바뀐 캔버스의 CSS 크기를 내부 해상도에 동기화
        // 이 부분이 있어야 리사이징 시 이미지가 깨지지 않습니다.
        const rect = this.canvas.getBoundingClientRect();
        if (this.canvas.width !== Math.floor(rect.width) || this.canvas.height !== Math.floor(rect.height)) {
            this.canvas.width = Math.floor(rect.width);
            this.canvas.height = Math.floor(rect.height);
            // 해상도가 바뀌었으므로 레이아웃 재계산
            this.updateLayout(this.sourceW, this.sourceH);
        }

        // 2. 배경 지우기
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 3. 이미지 그리기
        if (this.layout) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(
                source, 
                this.layout.x, 
                this.layout.y, 
                this.layout.width, 
                this.layout.height
            );
        }
    }

    drawLayer(source) {
        if (!this.ctx || !source || !this.layout) return;
        this.ctx.drawImage(
            source, 
            this.layout.x, 
            this.layout.y, 
            this.layout.width, 
            this.layout.height
        );
    }
}

export { WebCanvasRenderer };