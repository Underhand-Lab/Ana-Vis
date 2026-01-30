import { CanvasRenderer } from "../../canvas-renderer.js";

export class TrackFrameMaker {
    constructor() {
        this.conf = 0.5;
        this.trail = null;
        this.trackData = null;
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCtx = this.offscreenCanvas.getContext('2d');
        this.renderer = new CanvasRenderer();
        this.cachedImageData = null;
        this.lastIdx = 0;
    }

    setInstance(instance) { this.renderer.setCanvas(instance); }
    setConf(conf) { this.conf = conf; }
    setTrail(trail) {
        this.trail = trail;
        if (this.trackData != null) {
            const frameCount = trackData.getFrameCnt();
            const maxValue = frameCount > 0 ? frameCount - 1 : 0;
            this.trail.max = maxValue;
        }
        this.trail.addEventListener('change', () => {
            this.drawImageAt(this.lastIdx);
        });
    }
    
    setData(trackData) {
        this.trackData = trackData;
        if (trackData == null) return;
        if (this.trail != null) {
            const frameCount = trackData.getFrameCnt();
            const maxValue = frameCount > 0 ? frameCount - 1 : 0;
            this.trail.max = maxValue;
        }
        const image = this.trackData.getRawImgList(0)[0];
        if (image) this.renderer.updateLayout(image.width, image.height);
    }

    drawImageAt(idx) {
        if (!this.trackData || idx < 0) return;
        this.lastIdx = idx;
        const image = this.trackData.getRawImgList(0)[idx];
        if (!image) return;

        // 1. 배경 이미지 렌더링
        this.renderer.drawImage(image);

        // 2. 마스크 레이어 생성 (getSelectedBatAt 활용)
        const maskLayer = this._generateMaskLayer(idx);
        if (maskLayer) {
            this.renderer.drawLayer(maskLayer);
        }
    }

    _generateMaskLayer(idx) {
        // 마스크 해상도 파악을 위한 샘플 데이터 획득
        let sampleBat = null;
        for (let i = idx; i >= 0; i--) {
            sampleBat = this.trackData.getSelectedBatAt(i);
            if (sampleBat?.maskConfidenceMap) break;
        }
        if (!sampleBat) return null;

        const maskW = sampleBat.maskConfidenceMap[0].length;
        const maskH = sampleBat.maskConfidenceMap.length;

        if (this.offscreenCanvas.width !== maskW || this.offscreenCanvas.height !== maskH) {
            this.offscreenCanvas.width = maskW;
            this.offscreenCanvas.height = maskH;
            this.cachedImageData = this.offscreenCtx.createImageData(maskW, maskH);
        }

        this.cachedImageData.data.fill(0);
        const pixelBuffer = this.cachedImageData.data;
        const startIdx = Math.max(1, idx - parseInt(this.trail.value) + 1);

        for (let i = startIdx; i <= idx; i++) {
            const prev = this.trackData.getSelectedBatAt(i - 1);
            const curr = this.trackData.getSelectedBatAt(i);
            
            const alpha = Math.floor(((i - startIdx + 1) / (idx - startIdx + 1)) * 50) + 75;
            this.masking(pixelBuffer, prev, curr, this.conf, [0, 255, 0, alpha], maskW, maskH);
        }

        const nowBat = this.trackData.getSelectedBatAt(idx);
        if (nowBat?.maskConfidenceMap) {
            this.applyMaskToBuffer(pixelBuffer, nowBat.maskConfidenceMap, this.conf, [255, 128, 0, 180], maskW, maskH);
        }

        this.offscreenCtx.putImageData(this.cachedImageData, 0, 0);
        return this.offscreenCanvas;
    }

    masking(pixelData, prevBat, currBat, threshold, color, maskW, maskH) {
        if (prevBat?.maskConfidenceMap) {
            this.applyMaskToBuffer(pixelData, prevBat.maskConfidenceMap, threshold, color, maskW, maskH);
        }
        if (currBat?.maskConfidenceMap) {
            this.applyMaskToBuffer(pixelData, currBat.maskConfidenceMap, threshold, color, maskW, maskH);
        }
        
        // 두 마스크 사이의 공간을 8개의 점으로 연결하여 채움
        if (prevBat?.maskConfidenceMap && currBat?.maskConfidenceMap) {
            const vA = this.getMaskVertices(prevBat.maskConfidenceMap, threshold);
            const vB = this.getMaskVertices(currBat.maskConfidenceMap, threshold);
            
            if (vA && vB) {
                const points = [
                    vA.topLeft, vA.topRight, vA.bottomRight, vA.bottomLeft,
                    vB.topLeft, vB.topRight, vB.bottomRight, vB.bottomLeft
                ];
                this.fillPolygon(pixelData, points, color, maskW, maskH);
            }
        }
    }

    applyMaskToBuffer(pixelData, maskMap, threshold, color, maskW, maskH) {
        if (!maskMap) return;
        for (let y = 0; y < maskH; y++) {
            const row = maskMap[y];
            for (let x = 0; x < maskW; x++) {
                if (row[x] >= threshold) {
                    const idx = (y * maskW + x) * 4;
                    pixelData[idx] = color[0];
                    pixelData[idx+1] = color[1];
                    pixelData[idx+2] = color[2];
                    pixelData[idx+3] = color[3];
                }
            }
        }
    }

    /**
     * 상단과 하단에서 각각 좌우 끝점 2개씩, 총 4개의 정점을 추출합니다.
     */
    getMaskVertices(maskMap, threshold) {
        if (!maskMap || maskMap.length === 0) return null;
        const rows = maskMap.length, cols = maskMap[0].length;
        
        let topLeft = null, topRight = null;
        let bottomLeft = null, bottomRight = null;

        // 상단 영역 포인트 탐색
        for (let y = 0; y < rows; y++) {
            let foundInRow = false;
            for (let x = 0; x < cols; x++) {
                if (maskMap[y][x] >= threshold) {
                    if (!topLeft || x < topLeft.x) topLeft = { x, y };
                    if (!topRight || x > topRight.x) topRight = { x, y };
                    foundInRow = true;
                }
            }
            // 상단 정점이 어느 정도 잡히면 루프 종료 (두께 확보)
            if (topLeft && y > topLeft.y + 3) break;
        }

        // 하단 영역 포인트 탐색
        for (let y = rows - 1; y >= 0; y--) {
            let foundInRow = false;
            for (let x = 0; x < cols; x++) {
                if (maskMap[y][x] >= threshold) {
                    if (!bottomLeft || x < bottomLeft.x) bottomLeft = { x, y };
                    if (!bottomRight || x > bottomRight.x) bottomRight = { x, y };
                    foundInRow = true;
                }
            }
            if (bottomLeft && y < bottomLeft.y - 3) break;
        }

        return (topLeft && bottomRight) ? { topLeft, topRight, bottomLeft, bottomRight } : null;
    }

    /**
     * 전달된 점들을 볼록 다각형으로 정렬하여 내부를 채웁니다.
     */
    fillPolygon(pixelData, points, color, canvasW, canvasH) {
        const validPoints = points.filter(p => p !== null);
        if (validPoints.length < 3) return;

        // 중심점 기준 각도 정렬 (Convex Hull 구성)
        const center = validPoints.reduce((acc, p) => ({ x: acc.x + p.x / validPoints.length, y: acc.y + p.y / validPoints.length }), { x: 0, y: 0 });
        const sortedPoints = validPoints.sort((a, b) => {
            return Math.atan2(a.y - center.y, a.x - center.x) - Math.atan2(b.y - center.y, b.x - center.x);
        });

        let minX = Math.max(0, Math.floor(Math.min(...sortedPoints.map(p => p.x))));
        let maxX = Math.min(canvasW - 1, Math.ceil(Math.max(...sortedPoints.map(p => p.x))));
        let minY = Math.max(0, Math.floor(Math.min(...sortedPoints.map(p => p.y))));
        let maxY = Math.min(canvasH - 1, Math.ceil(Math.max(...sortedPoints.map(p => p.y))));

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                if (this.isPointInPolygon(sortedPoints, x, y)) {
                    const idx = (y * canvasW + x) * 4;
                    pixelData[idx] = color[0];
                    pixelData[idx+1] = color[1];
                    pixelData[idx+2] = color[2];
                    pixelData[idx+3] = color[3];
                }
            }
        }
    }

    isPointInPolygon(poly, x, y) {
        let inside = false;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
            if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
        }
        return inside;
    }
}