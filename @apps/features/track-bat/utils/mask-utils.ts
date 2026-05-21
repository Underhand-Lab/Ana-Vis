import { BatDetectedObject, Point, Vertices } from '../types';


// 마스크 맵을 픽셀 버퍼에 적용
export const applyMaskToBuffer = (pixelData: Uint8ClampedArray, maskMap: number[][], threshold: number, color: [number, number, number, number], maskW: number, maskH: number): void => {
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
export const getMaskVertices = (maskMap: number[][], threshold: number): Vertices | null => {
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

// 다각형 내부 판정 및 채우기
export const fillPolygon = (pixelData: Uint8ClampedArray, points: (Point | null)[], color: [number, number, number, number], canvasW: number, canvasH: number): void => {
	const validPoints = points.filter((p): p is Point => p !== null);
	if (validPoints.length < 3) return;

	const center = validPoints.reduce((acc, p) => ({
		x: acc.x + p.x / validPoints.length,
		y: acc.y + p.y / validPoints.length
	}), { x: 0, y: 0 });

	const sortedPoints = validPoints.sort((a, b) =>
		Math.atan2(a.y - center.y, a.x - center.x) - Math.atan2(b.y - center.y, b.x - center.x)
	);

	const isPointInPolygon = (poly: Point[], x: number, y: number): boolean => {
		let inside = false;
		for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
			const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
			if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
		}
		return inside;
	};

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

export const processMasking = (pixelData: Uint8ClampedArray, prevBat: BatDetectedObject | null, currBat: BatDetectedObject | null, threshold: number, color: [number, number, number, number], maskW: number, maskH: number): void => {
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