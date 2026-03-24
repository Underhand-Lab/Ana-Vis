import { useState, useCallback, useRef } from 'react';

export const useTrackFrame = (trackData) => {
  const [options, setOptions] = useState({
    trailColor: '#ff0000',
    boxColor: '#0000ff',
    showConfidence: true,
    trailWidth: 5,
  });

  const offscreenRef = useRef(null);

  /**
   * ✅ 공의 궤적, 바운딩 박스, 신뢰도 정보가 담긴 투명 레이어 반환
   */
  const getTrackLayer = (idx) => {
    if (!trackData || idx < 0) return null;

    const rawImgList = trackData.getRawImgList(0);
    const image = rawImgList[idx];
    if (!image) return null;

    // 오프스크린 캔버스 초기화 및 크기 설정
    if (!offscreenRef.current) offscreenRef.current = document.createElement('canvas');
    const canvas = offscreenRef.current;

    if (canvas.width !== image.width || canvas.height !== image.height) {
      canvas.width = image.width;
      canvas.height = image.height;
    }

    const ctx = canvas.getContext('2d');
    
    // ✅ 1. 레이어 초기화 (투명 배경)
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const ballList = trackData.getBallList();
    if (ballList) {
      // 2. 궤적(Trail) 그리기
      ctx.beginPath();
      ctx.strokeStyle = options.trailColor;
      ctx.lineWidth = options.trailWidth;
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

    // 결과 캔버스 복제 후 반환
    const layerCanvas = document.createElement('canvas');
    layerCanvas.width = canvas.width;
    layerCanvas.height = canvas.height;
    layerCanvas.getContext('2d').drawImage(canvas, 0, 0);

    return layerCanvas;
  }

  return { options, setOptions, getTrackLayer };
};