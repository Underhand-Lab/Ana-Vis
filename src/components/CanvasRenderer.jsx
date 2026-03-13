import React, { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';

/**
 * CanvasRenderer 컴포넌트
 * @param {HTMLImageElement|HTMLCanvasElement} source - 그릴 이미지 소스
 * @param {number} sourceW - 원본 영상/이미지의 가로 너비
 * @param {number} sourceH - 원본 영상/이미지의 세로 높이
 * @param {string} className - 외부에서 주입할 CSS 클래스명
 * @param {object} style - 외부에서 주입할 인라인 스타일
 */
const CanvasRenderer = forwardRef(({ source, sourceW, sourceH, className, style }, ref) => {
  const canvasRef = useRef(null);
  const layoutRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  // 1. 원본 비율에 맞춘 출력 영역(Letterbox) 계산
  const updateLayout = useCallback((canvasW, canvasH) => {
    if (sourceW === 0 || sourceH === 0) return;

    const sourceAspect = sourceW / sourceH;
    const targetAspect = canvasW / canvasH;

    let drawW, drawH, x, y;

    if (sourceAspect > targetAspect) {
      // 소스가 더 넓은 경우: 가로를 꽉 채우고 위아래 여백
      drawW = canvasW;
      drawH = canvasW / sourceAspect;
      x = 0;
      y = (canvasH - drawH) / 2;
    } else {
      // 소스가 더 높은 경우: 세로를 꽉 채우고 좌우 여백
      drawH = canvasH;
      drawW = canvasH * sourceAspect;
      x = (canvasW - drawW) / 2;
      y = 0;
    }

    layoutRef.current = {
      x: Math.floor(x),
      y: Math.floor(y),
      width: Math.floor(drawW),
      height: Math.floor(drawH)
    };
  }, [sourceW, sourceH]);

  // 2. 실제 그리기 로직 (해상도 동기화 포함)
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !source) return;

    const ctx = canvas.getContext('2d');
    
    // CSS 크기(실제 브라우저 노출 크기) 측정
    const rect = canvas.getBoundingClientRect();
    const targetW = Math.floor(rect.width);
    const targetH = Math.floor(rect.height);

    // [해상도 동기화] CSS 크기와 물리적 해상도가 다르면 일치시킴
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
      updateLayout(targetW, targetH);
    }

    // 배경 청소 (검은색 여백 처리)
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 이미지 출력
    const layout = layoutRef.current;
    if (layout && layout.width > 0) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(
        source,
        layout.x,
        layout.y,
        layout.width,
        layout.height
      );
    }
  }, [source, updateLayout]);

  // 외부(부모)에서 imperative하게 호출할 수 있는 인터페이스 제공
  useImperativeHandle(ref, () => ({
    redraw: () => draw(),
    getCanvas: () => canvasRef.current
  }));

  // 3. 리사이즈 감지 (ResizeObserver)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new ResizeObserver(() => {
      draw(); // 크기가 변하면 즉시 해상도 동기화 및 다시 그리기
    });

    observer.observe(canvas);
    return () => observer.disconnect();
  }, [draw]);

  // 소스 데이터 변경 시 갱신
  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      // 부모로부터 받은 className과 style을 적용
      className={className}
      style={{ 
        width: '100%', 
        height: '100%', 
        display: 'block', 
        backgroundColor: 'black',
        ...style 
      }}
    />
  );
});

export default CanvasRenderer;