import { Renderer } from './renderer-interface.js';
// 실제 프로젝트에서는 `@shopify/react-native-skia`를 설치해야 합니다.
import { Skia } from "@shopify/react-native-skia";

/**
 * React Native Skia를 사용하는 네이티브 환경 전용 렌더러입니다.
 */
class NativeCanvasRenderer extends Renderer {
    constructor() {
        super();
        this.canvas = null; // Skia Canvas 객체
        this.sourceW = 0;
        this.sourceH = 0;
        this.targetW = 0; // 네이티브 뷰 너비
        this.targetH = 0; // 네이티브 뷰 높이
        this.layout = null;
    }

    /**
     * @param {object} displaySurface - Skia의 Canvas 객체 (draw 콜백에서 전달됨)
     * @param {number} width - 현재 뷰의 레이아웃 너비
     * @param {number} height - 현재 뷰의 레이아웃 높이
     */
    setCanvas(displaySurface, width, height) {
        this.canvas = displaySurface;
        this.targetW = width;
        this.targetH = height;
    }

    updateLayout(sourceW, sourceH) {
        if (sourceW === 0 || sourceH === 0 || this.targetW === 0) return;
        
        this.sourceW = sourceW;
        this.sourceH = sourceH;

        const sourceAspect = sourceW / sourceH;
        const targetAspect = this.targetW / this.targetH;

        let drawW, drawH, x, y;

        // Letterbox 방식 계산 로직 (웹과 동일)
        if (sourceAspect > targetAspect) {
            drawW = this.targetW;
            drawH = this.targetW / sourceAspect;
            x = 0;
            y = (this.targetH - drawH) / 2;
        } else {
            drawH = this.targetH;
            drawW = this.targetH * sourceAspect;
            x = (this.targetW - drawW) / 2;
            y = 0;
        }

        this.layout = { 
            x: Math.floor(x), 
            y: Math.floor(y), 
            width: Math.floor(drawW), 
            height: Math.floor(drawH) 
        };
    }

    /**
     * @param {SkImage} source - Skia Image 객체
     */
    drawImage(source) {
        if (!this.canvas || !source || !this.layout) return;

        // 1. 배경 지우기 (검은색)
        this.canvas.clear(Skia.Color('black'));

        // 2. 이미지 그리기
        const srcRect = Skia.XYWHRect(0, 0, source.width(), source.height());
        const destRect = Skia.XYWHRect(this.layout.x, this.layout.y, this.layout.width, this.layout.height);
        
        this.canvas.drawImageRect(source, srcRect, destRect, Skia.Paint());
    }

    drawLayer(source) {
        if (!this.canvas || !source || !this.layout) return;
        const srcRect = Skia.XYWHRect(0, 0, source.width(), source.height());
        const destRect = Skia.XYWHRect(this.layout.x, this.layout.y, this.layout.width, this.layout.height);
        this.canvas.drawImageRect(source, srcRect, destRect, Skia.Paint());
    }
}

export { NativeCanvasRenderer };