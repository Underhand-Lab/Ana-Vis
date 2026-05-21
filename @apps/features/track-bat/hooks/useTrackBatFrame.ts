import { useState, useCallback, useRef } from 'react';
import { getRgba } from '@shared/utils/getRgba'
import { CVValData } from '@packages/cv-val/data/cvval-data';

import { TrackBatData } from '../data/track-bat-data';
import { BatDetectedObject } from '../types';
import featureName from '../constant';
import { applyMaskToBuffer, processMasking } from '../utils/mask-utils';

export interface ColorsState {
	batColor: string;
	trailColor: string;
}

/**
 * TrackBatFrameMaker의 복잡한 픽셀 조작 및 마스킹 로직을 
 * React 환경에서 사용할 수 있도록 변환한 Custom Hook입니다.
 */
export const useTrackBatFrame = (trackData: CVValData | null) => {
	const [trailLen, setTrailLen] = useState<number>(3);
	const [colors, setColors] = useState<ColorsState>({
		batColor: '#ff8000',
		trailColor: '#00ff00'
	});

	const offscreenRef = useRef<HTMLCanvasElement | null>(null);
	const cachedImageData = useRef<ImageData | null>(null);

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

		const batRGBA = getRgba(colors.batColor);
		const trailRGBA = getRgba(colors.trailColor);

		// 2. 궤적 및 배트 마스킹 (픽셀 데이터 생성)
		const effectiveLen = length !== undefined ? length : trailLen;
		const startIdx = Math.max(1, idx - effectiveLen + 1);
		for (let i = startIdx; i <= idx; i++) {
			const prev = batData.getSelectedBatAt(i - 1);
			const curr = batData.getSelectedBatAt(i);
			processMasking(pixelBuffer, prev, curr, actualConf, trailRGBA, maskW, maskH);
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