import React, { forwardRef, useImperativeHandle, useRef, useCallback, CSSProperties, useEffect } from 'react';

export interface CanvasRendererHandle {
    drawImage: (source: CanvasImageSource) => void;
    drawLayer: (source: CanvasImageSource) => void;
    getCanvas: () => HTMLCanvasElement | null;
    updateLayout: (sourceW: number, sourceH: number) => void;
}

interface CanvasRendererProps {
    className?: string;
    style?: CSSProperties;
}

/**
 * CanvasRenderer 컴포넌트
 * 기존의 imperative한 클래스 로직을 React 컴포넌트로 캡슐화했습니다.
 */
const CanvasRenderer = forwardRef<CanvasRendererHandle, CanvasRendererProps>(
    ({ className, style }, ref) => {
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const layoutRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
        const sourceSizeRef = useRef({ w: 0, h: 0 });
        const lastSourceRef = useRef<CanvasImageSource | null>(null);

        // 1. 원본 비율에 맞춘 출력 영역(Letterbox) 계산
        const updateLayout = useCallback((sourceW: number, sourceH: number) => {
            const canvas = canvasRef.current;
            if (!canvas || sourceW === 0 || sourceH === 0) return;

            sourceSizeRef.current = { w: sourceW, h: sourceH };

            // 디바이스 픽셀 밀도를 고려한 실제 렌더링 크기 계산
            const dpr = window.devicePixelRatio || 1;
            const targetW = canvas.width / dpr;
            const targetH = canvas.height / dpr;

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

            layoutRef.current = {
                x: Math.floor(x),
                y: Math.floor(y),
                width: Math.floor(drawW),
                height: Math.floor(drawH),
            };
        }, []);

        // 2. 메인 이미지 그리기 (해상도 동기화 포함)
        const drawImage = useCallback((source: CanvasImageSource) => {
            const canvas = canvasRef.current;
            if (!canvas || !source) return;

            lastSourceRef.current = source;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;

            // 해상도가 바뀌었을 경우 동기화
            if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
                canvas.width = Math.floor(rect.width * dpr);
                canvas.height = Math.floor(rect.height * dpr);
                ctx.scale(dpr, dpr);
                updateLayout(sourceSizeRef.current.w, sourceSizeRef.current.h);
            }

            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const layout = layoutRef.current;
            if (layout.width > 0) {
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(source, layout.x, layout.y, layout.width, layout.height);
            }
        }, [updateLayout]);

        // 3. 레이어 추가 그리기
        const drawLayer = useCallback((source: CanvasImageSource) => {
            const canvas = canvasRef.current;
            if (!canvas || !source) return;
            const ctx = canvas.getContext('2d');
            const layout = layoutRef.current;
            if (!ctx || !layout.width) return;

            ctx.drawImage(source, layout.x, layout.y, layout.width, layout.height);
        }, []);

        // 4. 크기 변경 감지 (ResizeObserver)
        useEffect(() => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const observer = new ResizeObserver(() => {
                // 크기가 변하면 마지막에 그렸던 소스를 다시 그려서 해상도를 동기화합니다.
                if (lastSourceRef.current) {
                    drawImage(lastSourceRef.current);
                }
            });

            observer.observe(canvas);
            return () => observer.disconnect();
        }, [drawImage]);

        // 부모 컴포넌트에게 노출할 인터페이스
        useImperativeHandle(ref, () => ({
            drawImage,
            drawLayer,
            getCanvas: () => canvasRef.current,
            updateLayout
        }));

        return (
            <canvas
                ref={canvasRef}
                className={className}
                style={{
                    display: 'block',
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'black',
                    ...style
                }}
            />
        );
    }
);

CanvasRenderer.displayName = 'CanvasRenderer';

export default CanvasRenderer;