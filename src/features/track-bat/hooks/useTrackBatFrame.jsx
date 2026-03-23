import { useState, useCallback, useRef } from 'react';

/**
 * TrackBatFrameMaker의 복잡한 픽셀 조작 및 마스킹 로직을 
 * React 환경에서 사용할 수 있도록 변환한 Custom Hook입니다.
 */
export const useTrackBatFrame = (trackData) => {
  const [trailLen, setTrailLen] = useState(3);
  const [colors, setColors] = useState({
    batColor: '#ff8000',
    batAlpha: 100,
    trailColor: '#00ff00',
    trailAlpha: 100
  });

  const offscreenRef = useRef(null);
  const cachedImageData = useRef(null);

  // Hex 색상과 Alpha 값을 RGBA 배열로 변환
  const getRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b, parseInt(alpha)];
  };

  // 마스크 맵을 픽셀 버퍼에 적용
  const applyMaskToBuffer = (pixelData, maskMap, threshold, color, maskW, maskH) => {
    if (!maskMap) return;
    for (let y = 0; y < maskH; y++) {
      const row = maskMap[y];
      const rowOffset = y * maskW;
      for (let x = 0; x < maskW; x++) {
        if (row[x] >= threshold) {
          const idx = (rowOffset + x) * 4;
          pixelData[idx] = color[0];
          pixelData[idx + 1] = color[1];
          pixelData[idx + 2] = color[2];
          pixelData[idx + 3] = color[3];
        }
      }
    }
  };

  // 마스크의 모서리 정점 추출
  const getMaskVertices = (maskMap, threshold) => {
    if (!maskMap || maskMap.length === 0) return null;
    const rows = maskMap.length, cols = maskMap[0].length;
    let topLeft = null, topRight = null, bottomLeft = null, bottomRight = null;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (maskMap[y][x] >= threshold) {
          if (!topLeft || x < topLeft.x) topLeft = { x, y };
          if (!topRight || x > topRight.x) topRight = { x, y };
        }
      }
      if (topLeft && y > topLeft.y + 3) break;
    }

    for (let y = rows - 1; y >= 0; y--) {
      for (let x = 0; x < cols; x++) {
        if (maskMap[y][x] >= threshold) {
          if (!bottomLeft || x < bottomLeft.x) bottomLeft = { x, y };
          if (!bottomRight || x > bottomRight.x) bottomRight = { x, y };
        }
      }
      if (bottomLeft && y < bottomLeft.y - 3) break;
    }
    return (topLeft && bottomRight) ? { topLeft, topRight, bottomLeft, bottomRight } : null;
  };

  // 다각형 내부 판정
  const isPointInPolygon = (poly, x, y) => {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  };

  // 다각형 채우기
  const fillPolygon = (pixelData, points, color, canvasW, canvasH) => {
    const validPoints = points.filter(p => p !== null);
    if (validPoints.length < 3) return;

    const center = validPoints.reduce((acc, p) => ({
      x: acc.x + p.x / validPoints.length,
      y: acc.y + p.y / validPoints.length
    }), { x: 0, y: 0 });

    const sortedPoints = validPoints.sort((a, b) =>
      Math.atan2(a.y - center.y, a.x - center.x) - Math.atan2(b.y - center.y, b.x - center.x)
    );

    let minX = Math.max(0, Math.floor(Math.min(...sortedPoints.map(p => p.x))));
    let maxX = Math.min(canvasW - 1, Math.ceil(Math.max(...sortedPoints.map(p => p.x))));
    let minY = Math.max(0, Math.floor(Math.min(...sortedPoints.map(p => p.y))));
    let maxY = Math.min(canvasH - 1, Math.ceil(Math.max(...sortedPoints.map(p => p.y))));

    for (let y = minY; y <= maxY; y++) {
      const rowOffset = y * canvasW;
      for (let x = minX; x <= maxX; x++) {
        if (isPointInPolygon(sortedPoints, x, y)) {
          const idx = (rowOffset + x) * 4;
          pixelData[idx] = color[0];
          pixelData[idx + 1] = color[1];
          pixelData[idx + 2] = color[2];
          pixelData[idx + 3] = color[3];
        }
      }
    }
  };

  // 프레임 간 마스킹 및 폴리곤 합성
  const masking = (pixelData, prevBat, currBat, threshold, color, maskW, maskH) => {
    if (prevBat?.maskConfidenceMap) applyMaskToBuffer(pixelData, prevBat.maskConfidenceMap, threshold, color, maskW, maskH);
    if (currBat?.maskConfidenceMap) applyMaskToBuffer(pixelData, currBat.maskConfidenceMap, threshold, color, maskW, maskH);

    if (prevBat?.maskConfidenceMap && currBat?.maskConfidenceMap) {
      const vA = getMaskVertices(prevBat.maskConfidenceMap, threshold);
      const vB = getMaskVertices(currBat.maskConfidenceMap, threshold);

      if (vA && vB) {
        const points = [
          vA.topLeft, vA.topRight, vA.bottomRight, vA.bottomLeft,
          vB.topLeft, vB.topRight, vB.bottomRight, vB.bottomLeft
        ];
        fillPolygon(pixelData, points, color, maskW, maskH);
      }
    }
  };
  // ... (상단 로직 동일)

  const getTrailLayer = (idx) => {
    if (!trackData || idx < 0) return null;

    // 1. 마스크 데이터 존재 여부 확인 및 크기 계산
    let sampleBat = null;
    for (let i = idx; i >= 0; i--) {
      sampleBat = trackData.getSelectedBatAt(i);
      if (sampleBat?.maskConfidenceMap) break;
    }
    if (!sampleBat) return null;

    const maskW = sampleBat.maskConfidenceMap[0].length;
    const maskH = sampleBat.maskConfidenceMap.length;

    if (!offscreenRef.current) offscreenRef.current = document.createElement('canvas');
    const canvas = offscreenRef.current;

    if (canvas.width !== maskW || canvas.height !== maskH) {
      canvas.width = maskW;
      canvas.height = maskH;
      cachedImageData.current = canvas.getContext('2d').createImageData(maskW, maskH);
    }

    const ctx = canvas.getContext('2d');
    const pixelBuffer = cachedImageData.current.data;
    pixelBuffer.fill(0); // 매 프레임 투명하게 초기화

    const conf = trackData.getConf();
    const batRGBA = getRgba(colors.batColor, colors.batAlpha);
    const trailRGBA = getRgba(colors.trailColor, colors.trailAlpha);

    // 2. 궤적 및 배트 마스킹 (픽셀 데이터 생성)
    const startIdx = Math.max(1, idx - trailLen + 1);
    for (let i = startIdx; i <= idx; i++) {
      const prev = trackData.getSelectedBatAt(i - 1);
      const curr = trackData.getSelectedBatAt(i);
      masking(pixelBuffer, prev, curr, conf, trailRGBA, maskW, maskH);
    }

    const nowBat = trackData.getSelectedBatAt(idx);
    if (nowBat?.maskConfidenceMap) {
      applyMaskToBuffer(pixelBuffer, nowBat.maskConfidenceMap, conf, batRGBA, maskW, maskH);
    }

    ctx.putImageData(cachedImageData.current, 0, 0);

    // 3. ✅ 배경 없이 '마스크 레이어'만 있는 캔버스 반환
    // (메모리 효율을 위해 새로운 캔버스를 복사해서 반환합니다)
    const layerCanvas = document.createElement('canvas');
    layerCanvas.width = maskW;
    layerCanvas.height = maskH;
    layerCanvas.getContext('2d').drawImage(canvas, 0, 0);

    return layerCanvas;
  };

  return { colors, setColors, trailLen, setTrailLen, getTrailLayer };
};