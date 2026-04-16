import { useState, useCallback, useRef, useEffect } from 'react';

export const useTrackFrame = (trackData) => {
  const [options, setOptions] = useState({
    trailColor: '#ff0000',
    boxColor: '#0000ff',
    showConfidence: true,
    trailWidth: 5,
  });

  // 모바일 여부에 따른 스케일 계수 계산 (가독성 향상)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const uiScale = isMobile ? 1.5 : 1; // 모바일에서 선과 글자를 조금 더 크게 표시

  const offscreenRef = useRef(null);
  
  /** 
   * 성능 최적화를 위한 캐싱 Ref: 
   * 마지막으로 렌더링된 프레임 번호, 데이터, 옵션 객체의 참조를 저장합니다.
   */
  const lastRendered = useRef({ idx: -1, options: null, trackData: null });

  /**
   * ✅ 공의 궤적, 바운딩 박스, 신뢰도 정보가 담긴 투명 레이어 반환
   */
  const getTrackLayer = (idx) => {
    if (!trackData || idx < 0) return null;

    // 1. 성능 최적화: 동일한 조건(데이터, 프레임, 옵션)이라면 새로 그리지 않고 기존 캔버스 즉시 반환
    if (
      lastRendered.current.idx === idx && 
      lastRendered.current.options === options &&
      lastRendered.current.trackData === trackData
    ) {
      return offscreenRef.current;
    }

    const image = trackData.getRawImgList(0)[idx];
    if (!image) return null;

    // 오프스크린 캔버스 초기화 및 크기 설정
    if (!offscreenRef.current) offscreenRef.current = document.createElement('canvas');
    const canvas = offscreenRef.current;

    if (canvas.width !== image.width || canvas.height !== image.height) {
      canvas.width = image.width;
      canvas.height = image.height;
    }

    const ctx = canvas.getContext('2d');
    
    // ✅ 2. 레이어 초기화 (투명 배경)
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const ballList = trackData.getBallList();
    if (ballList) {
      // 2. 궤적(Trail) 그리기
      ctx.beginPath();
      ctx.strokeStyle = options.trailColor;
      ctx.lineWidth = options.trailWidth * uiScale;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      let isDrawing = false;
      // 0번 프레임부터 현재 프레임(idx)까지의 선 연결
      for (let i = 0; i <= idx; i++) {
        const ball = trackData.getSelectedBallAt(i);
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

      // 3. 현재 프레임의 바운딩 박스 및 신뢰도
      const nowBall = trackData.getSelectedBallAt(idx);
      if (nowBall) {
        const [bx, by, bw, bh] = nowBall.bbox;
        ctx.strokeStyle = options.boxColor;
        ctx.lineWidth = 3 * uiScale;
        ctx.strokeRect(bx, by, bw, bh);

        if (options.showConfidence) {
          ctx.fillStyle = 'white';
          ctx.font = `bold ${24 * uiScale}px Arial`;
          ctx.shadowColor = 'black';
          ctx.shadowBlur = 4 * uiScale;
          ctx.fillText(`Conf: ${nowBall.confidence.toFixed(2)}`, bx, by - (10 * uiScale));
          ctx.shadowBlur = 0;
        }
      }
    }

    // 3. 현재 렌더링 상태 기록 (다음 호출 시 비교용)
    lastRendered.current = { idx, options, trackData };

    return canvas;
  }

  return { options, setOptions, getTrackLayer };
};