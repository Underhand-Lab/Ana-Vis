import { useState, useCallback, useRef } from 'react';
import { TrackBatData } from '../core/track-bat-data';
import { BatDetectedObject } from '../types';
import { CVValData } from '@/features/cv-val/core/cvval-data';
import featureName from '../constant';

interface ColorsState {
  batColor: string;
  batAlpha: number;
  trailColor: string;
  trailAlpha: number;
}

interface Point {
  x: number;
  y: number;
}

interface Vertices {
  topLeft: Point;
  topRight: Point;
  bottomLeft: Point;
  bottomRight: Point;
}

/**
 * TrackBatFrameMaker의 복잡한 픽셀 조작 및 마스킹 로직을 
 * React 환경에서 사용할 수 있도록 변환한 Custom Hook입니다.
 */
export const useTrackBatFrame = (trackData: CVValData | null) => {
  const [trailLen, setTrailLen] = useState<number>(3);
  const [colors, setColors] = useState<ColorsState>({
    batColor: '#ff8000',
    batAlpha: 100,
    trailColor: '#00ff00',
    trailAlpha: 100
  });

  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const cachedImageData = useRef<ImageData | null>(null);

  // 색상 문자열(Hex 또는 RGBA)을 [R, G, B, A(0-255)] 배열로 변환
  const getRgba = (colorStr: string, alphaOverride?: number): [number, number, number, number] => {
    if (!colorStr) return [0, 0, 0, 0];

    // 1. RGBA 문자열 케이스 (rgba(255, 255, 255, 1.0))
    const rgbaMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (rgbaMatch) {
      const r = parseInt(rgbaMatch[1]);
      const g = parseInt(rgbaMatch[2]);
      const b = parseInt(rgbaMatch[3]);
      // alphaOverride가 있으면 우선 사용(0-255), 없으면 문자열 내 alpha(0-1)를 255 스케일로 변환
      const a = alphaOverride !== undefined ? Math.round(alphaOverride) : 
               (rgbaMatch[4] ? Math.round(parseFloat(rgbaMatch[4]) * 255) : 255);
      return [r, g, b, a];
    }

    // 2. Hex 문자열 케이스 (#ffffff)
    if (colorStr.startsWith('#')) {
      const r = parseInt(colorStr.slice(1, 3), 16);
      const g = parseInt(colorStr.slice(3, 5), 16);
      const b = parseInt(colorStr.slice(5, 7), 16);
      const a = alphaOverride !== undefined ? Math.round(alphaOverride) : 255;
      return [r, g, b, a];
    }

    return [255, 255, 255, 255];
  };

  // 마스크 맵을 픽셀 버퍼에 적용
  const applyMaskToBuffer = (pixelData: Uint8ClampedArray, maskMap: number[][], threshold: number, color: [number, number, number, number], maskW: number, maskH: number): void => {
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
  const getMaskVertices = (maskMap: number[][], threshold: number): Vertices | null => {
    if (!maskMap || maskMap.length === 0) return null;
    const rows = maskMap.length, cols = maskMap[0].length;
    let topLeft: Point | null = null, topRight: Point | null = null, bottomLeft: Point | null = null, bottomRight: Point | null = null;

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
    return (topLeft && bottomRight && topRight && bottomLeft) ? { topLeft, topRight, bottomLeft, bottomRight } : null;
  };

  // 다각형 내부 판정
  const isPointInPolygon = (poly: Point[], x: number, y: number): boolean => {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  };

  // 다각형 채우기
  const fillPolygon = (pixelData: Uint8ClampedArray, points: (Point | null)[], color: [number, number, number, number], canvasW: number, canvasH: number): void => {
    const validPoints = points.filter((p): p is Point => p !== null);
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
  const masking = (pixelData: Uint8ClampedArray, prevBat: BatDetectedObject | null, currBat: BatDetectedObject | null, threshold: number, color: [number, number, number, number], maskW: number, maskH: number): void => {
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

  const getTrailLayer = useCallback((idx: number, length?: number): HTMLCanvasElement | null => {
    if (!trackData || !trackData.exist(featureName) || idx < 0) return null;
    
    const batData = trackData.get(featureName) as TrackBatData;

    // 1. 마스크 데이터 존재 여부 확인 및 크기 계산
    let sampleBat: BatDetectedObject | null = null;
    for (let i = idx; i >= 0; i--) {
      sampleBat = batData.getSelectedBatAt(i);
      if (sampleBat?.maskConfidenceMap) break;
    }
    if (!sampleBat || !sampleBat.maskConfidenceMap) return null;

    const maskW = sampleBat.maskConfidenceMap[0].length;
    const maskH = sampleBat.maskConfidenceMap.length;

    if (!offscreenRef.current) offscreenRef.current = document.createElement('canvas');
    const canvas = offscreenRef.current;

    if (canvas.width !== maskW || canvas.height !== maskH) {
      canvas.width = maskW;
      canvas.height = maskH;
      const ctx2d = canvas.getContext('2d');
      if (ctx2d) {
        cachedImageData.current = ctx2d.createImageData(maskW, maskH);
      }
    }

    const ctx = canvas.getContext('2d');
    if (!ctx || !cachedImageData.current) return null;

    const pixelBuffer = cachedImageData.current.data;
    pixelBuffer.fill(0); // 매 프레임 투명하게 초기화

    const actualConf = (trackData as any).getConf ? (trackData as any).getConf() : 0.1;

    // colors 객체 내에 이미 rgba 정보가 포함되어 있으므로 alphaOverride 없이 호출 가능
    const batRGBA = getRgba(colors.batColor, colors.batAlpha);
    const trailRGBA = getRgba(colors.trailColor, colors.trailAlpha);

    // 2. 궤적 및 배트 마스킹 (픽셀 데이터 생성)
    const effectiveLen = length !== undefined ? length : trailLen;
    const startIdx = Math.max(1, idx - effectiveLen + 1);
    for (let i = startIdx; i <= idx; i++) {
      const prev = batData.getSelectedBatAt(i - 1);
      const curr = batData.getSelectedBatAt(i);
      masking(pixelBuffer, prev, curr, actualConf, trailRGBA, maskW, maskH);
    }

    const nowBat = batData.getSelectedBatAt(idx);
    if (nowBat?.maskConfidenceMap) {
      applyMaskToBuffer(pixelBuffer, nowBat.maskConfidenceMap, actualConf, batRGBA, maskW, maskH);
    }

    ctx.putImageData(cachedImageData.current, 0, 0);

    // 3. ✅ 배경 없이 '마스크 레이어'만 있는 캔버스 반환
    // (메모리 효율을 위해 새로운 캔버스를 복사해서 반환합니다)
    const layerCanvas = document.createElement('canvas');
    layerCanvas.width = maskW;
    layerCanvas.height = maskH;
    const layerCtx = layerCanvas.getContext('2d');
    if (layerCtx) {
      layerCtx.drawImage(canvas, 0, 0);
    }

    return layerCanvas;
  }, [trackData, colors, trailLen]);

  /**
   * ✅ 편집 모드용 레이어 반환 (모든 후보군 시각화)
   */
  const getEditLayer = useCallback((idx: number, candidates: any[], selectedIdx: number): HTMLCanvasElement | null => {
    const trailLayer = getTrailLayer(idx, 1);
    
    if (!trailLayer || !trackData) return null;

    const canvas = document.createElement('canvas');
    canvas.width = trailLayer.width;
    canvas.height = trailLayer.height;
    const ctx = canvas.getContext('2d')!;

    ctx.drawImage(trailLayer, 0, 0);

    // 모든 후보군 박스 시각화
    candidates.forEach((cand, i) => {
      const isSelected = selectedIdx === i;
      if (!cand.bbox) return;
      
      const [bx, by, bw, bh] = cand.bbox;
      ctx.strokeStyle = isSelected ? '#007bff' : 'rgba(255, 255, 0, 0.7)';
      ctx.lineWidth = isSelected ? 4 : 2;
      ctx.strokeRect(bx, by, bw, bh);

      ctx.fillStyle = isSelected ? '#007bff' : 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(bx, by - 25, 35, 25);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 16px Arial';
      ctx.fillText(`${i + 1}`, bx + 5, by - 7);
    });

    return canvas;
  }, [getTrailLayer, trackData]);

  return { colors, setColors, trailLen, setTrailLen, getTrailLayer, getEditLayer };
};