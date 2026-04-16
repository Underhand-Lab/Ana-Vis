/**
 * @abstract
 * 모든 렌더러 구현체가 따라야 할 추상 인터페이스입니다.
 * JavaScript에서는 명시적인 인터페이스가 없으므로, 추상 클래스 패턴을 사용하여
 * 구현되지 않은 메서드 호출 시 오류를 발생시킵니다.
 */
class Renderer {
    constructor() {
        if (new.target === Renderer) {
            throw new TypeError("Cannot construct Renderer instances directly. Use a concrete implementation.");
        }
    }

    /**
     * 렌더러가 사용할 디스플레이 표면(예: HTMLCanvasElement, React Native Skia Canvas)을 설정합니다.
     * @param {any} displaySurface - 플랫폼별 디스플레이 표면 객체.
     */
    setCanvas(displaySurface) {
        throw new Error("Method 'setCanvas()' must be implemented by a subclass.");
    }

    /**
     * 원본 콘텐츠의 크기를 기반으로 렌더링 레이아웃을 업데이트합니다.
     * @param {number} sourceW - 원본 콘텐츠의 너비.
     * @param {number} sourceH - 원본 콘텐츠의 높이.
     */
    updateLayout(sourceW, sourceH) {
        throw new Error("Method 'updateLayout()' must be implemented by a subclass.");
    }

    /**
     * 지정된 소스를 디스플레이 표면에 그립니다.
     * @param {any} source - 플랫폼별 이미지 소스 (예: HTMLImageElement, HTMLCanvasElement, ImageBitmap, Skia Image).
     */
    drawImage(source) {
        throw new Error("Method 'drawImage()' must be implemented by a subclass.");
    }
}

export { Renderer };