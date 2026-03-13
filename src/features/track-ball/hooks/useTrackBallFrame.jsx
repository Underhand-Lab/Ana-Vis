import { useState, useCallback, useRef, useEffect } from 'react';

export const useTrackFrame = (trackData, renderer) => {
  const [options, setOptions] = useState({
    trailColor: '#ff0000',
    boxColor: '#0000ff',
    showConfidence: true,
    trailWidth: 5,
  });

  const offscreenRef = useRef(null);

  // 오프스크린 캔버스 초기화
  useEffect(() => {
    if (!offscreenRef.current) {
      offscreenRef.current = document.createElement('canvas');
    }
  }, []);

  const drawImageAt = useCallback((idx) => {
    if (!trackData || idx < 0 || !renderer) return;

    const image = trackData.getRawImgList(0)[idx];
    if (!image) return;

    const canvas = offscreenRef.current;
    const ctx = canvas.getContext('2d');

    // 캔버스 크기 동기화
    if (canvas.width !== image.width || canvas.height !== image.height) {
      canvas.width = image.width;
      canvas.height = image.height;
      renderer.updateLayout(image.width, image.height);
    }

    // 1. 배경 이미지 그리기
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    const ballList = trackData.getBallList();
    if (ballList) {
      // 2. 궤적(Trail) 그리기
      ctx.beginPath();
      ctx.strokeStyle = options.trailColor;
      ctx.lineWidth = options.trailWidth;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      let isDrawing = false;
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

      // 3. 바운딩 박스 및 신뢰도
      const nowBall = trackData.getSelectedBallAt(idx);
      if (nowBall) {
        const [bx, by, bw, bh] = nowBall.bbox;
        ctx.strokeStyle = options.boxColor;
        ctx.lineWidth = 3;
        ctx.strokeRect(bx, by, bw, bh);

        if (options.showConfidence) {
          ctx.fillStyle = 'white';
          ctx.font = 'bold 30px Arial';
          ctx.shadowColor = 'black';
          ctx.shadowBlur = 4;
          ctx.fillText(`Conf: ${nowBall.confidence.toFixed(2)}`, bx, by - 10);
          ctx.shadowBlur = 0;
        }
      }
    }

    renderer.drawImage(canvas);
  }, [trackData, renderer, options]);

  return { options, setOptions, drawImageAt };
};