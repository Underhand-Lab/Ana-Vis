import { useState, useCallback, useRef, useEffect } from 'react';

import { CVValData } from '@packages/cv-val/data/cvval-data';

import { TrackBallData } from '../data/track-ball-data';
import { DetectedObject } from '../types';
import featureName from '../constant';

interface TrackFrameOptions {
	trailColor: string;
	boxColor: string;
	showConfidence: boolean;
	trailWidth: number;
}

interface LastRenderedState {
	idx: number;
	length?: number;
	isEdit?: boolean;
	selectedIdx?: number;
	options: TrackFrameOptions | null;
	trackData: CVValData | null;
}

export const useTrackBallFrame = (trackData: CVValData | null) => {
	const [options, setOptions] = useState<TrackFrameOptions>({
		trailColor: '#ff0000',
		boxColor: '#0000ff',
		showConfidence: true,
		trailWidth: 5,
	});

	// 모바일 여부에 따른 스케일 계수 계산 (가독성 향상)
	const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);

	useEffect(() => {
		const handleResize = () => setIsMobile(window.innerWidth < 768);
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);

	const uiScale = isMobile ? 1.5 : 1; // 모바일에서 선과 글자를 조금 더 크게 표시

	const offscreenRef = useRef<HTMLCanvasElement | null>(null);

	/** 
	 * 성능 최적화를 위한 캐싱 Ref: 
	 * 마지막으로 렌더링된 프레임 번호, 데이터, 옵션 객체의 참조를 저장합니다.
	 */
	const lastRendered = useRef<LastRenderedState>({ idx: -1, options: null, trackData: null });

	/**
	 * ✅ 공의 궤적, 바운딩 박스, 신뢰도 정보가 담긴 투명 레이어 반환
	 */
	const getTrailLayer = useCallback((idx: number, length?: number): HTMLCanvasElement | null => {
		if (!trackData || !trackData.exist(featureName) || idx < 0) return null;
		if (
			lastRendered.current.idx === idx &&
			lastRendered.current.length === length &&
			!lastRendered.current.isEdit &&
			lastRendered.current.options === options &&
			lastRendered.current.trackData === trackData
		) {
			return offscreenRef.current;
		}

		const image: ImageBitmap | undefined = trackData.getRawImgList(0)?.[idx];
		if (!image) return null;

		// 오프스크린 캔버스 초기화 및 크기 설정
		if (!offscreenRef.current) offscreenRef.current = document.createElement('canvas');
		const canvas = offscreenRef.current;

		if (canvas.width !== image.width || canvas.height !== image.height) {
			canvas.width = image.width;
			canvas.height = image.height;
		}

		const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

		// ✅ 2. 레이어 초기화 (투명 배경)
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		const ballData = trackData.get(featureName) as TrackBallData;
		const ballList = ballData.getBallList();
		if (ballList) {
			// 2. 궤적(Trail) 그리기
			ctx.beginPath();
			ctx.strokeStyle = options.trailColor;
			ctx.lineWidth = options.trailWidth * uiScale;
			ctx.lineJoin = 'round';
			ctx.lineCap = 'round';

			let isDrawing = false;

			// length가 지정된 경우 해당 범위만큼만, 아니면 처음부터 그리기
			const startIdx = length ? Math.max(0, idx - length + 1) : 0;
			for (let i = startIdx; i <= idx; i++) {
				const ball: DetectedObject | null = ballData.getSelectedBallAt(i);
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
			const nowBall: DetectedObject | null = ballData.getSelectedBallAt(idx);
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
		lastRendered.current = { idx, length, isEdit: false, options, trackData };

		return canvas;
	}, [trackData, options, uiScale]);

	/**
	 * ✅ 편집 모드용 레이어 반환 (후보군 박스 및 번호 포함)
	 */
	const getEditLayer = useCallback((idx: number, candidates: any[], selectedIdx: number): HTMLCanvasElement | null => {
		const trailLayer = getTrailLayer(idx, 1); // 편집 시엔 무조건 trail 1 고정
		
		if (!trailLayer || !trackData) return null;

		const canvas = document.createElement('canvas');
		canvas.width = trailLayer.width;
		canvas.height = trailLayer.height;
		const ctx = canvas.getContext('2d')!;

		// 1. 기존 궤적 레이어 복사
		ctx.drawImage(trailLayer, 0, 0);

		// 2. 후보군 박스 그리기
		candidates.forEach((cand, i) => {
			const isSelected = selectedIdx === i;
			const [bx, by, bw, bh] = cand.bbox;

			ctx.strokeStyle = isSelected ? '#007bff' : 'rgba(255, 255, 255, 0.8)';
			ctx.lineWidth = (isSelected ? 6 : 3) * uiScale;
			ctx.strokeRect(bx, by, bw, bh);

			// 라벨 배경
			ctx.fillStyle = isSelected ? '#007bff' : 'rgba(0, 0, 0, 0.6)';
			const labelH = 30 * uiScale;
			const labelW = 45 * uiScale;
			ctx.fillRect(bx, by - labelH, labelW, labelH);

			// 라벨 텍스트 (번호)
			ctx.fillStyle = 'white';
			ctx.font = `bold ${20 * uiScale}px Arial`;
			ctx.fillText(`${i + 1}`, bx + (10 * uiScale), by - (7 * uiScale));
		});

		return canvas;
	}, [getTrailLayer, trackData, uiScale]);

	return { options, setOptions, getTrailLayer, getEditLayer };
};