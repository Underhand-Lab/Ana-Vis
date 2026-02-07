import { CanvasRenderer } from "../../canvas-renderer.js";

export class TrackBatFrameMaker {
    constructor() {
        this.trail = null;
        this.trackData = null;
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCtx = this.offscreenCanvas.getContext('2d');
        this.renderer = new CanvasRenderer();
        this.cachedImageData = null;
        this.lastIdx = 0;

        // 색상 초기값 설정
        this.trailColor = [255, 0, 0, 150];      // 과거 궤적 (RGBA)
        this.currentBatColor = [255, 0, 0, 255]; // 현재 배트 (RGBA)
    }

    bindUI(instance) {
        const canvas = instance.querySelectorAll('canvas')[0];
        this.renderer.setCanvas(canvas);
        if (this.trackData == null) return;
        const metadata = this.trackData.getVideoMetadata(0);
        if (metadata) this.renderer.updateLayout(metadata.width, metadata.height);
    }

    setTrail(trail) {
        this.trail = trail;
        if (this.trackData != null) {
            const frameCount = this.trackData.getFrameCnt();
            this.trail.max = frameCount > 0 ? frameCount - 1 : 0;
        }
        this.trail.addEventListener('change', () => {
            this.drawImageAt(this.lastIdx);
        });
    }

    setColors(currentRGBA, trailRGBA) {
        if (trailRGBA) this.trailColor = trailRGBA;
        if (currentRGBA) this.currentBatColor = currentRGBA;
    }

    setData(trackData) {
        this.trackData = trackData;
        if (!trackData) return;
        if (this.trail) {
            const frameCount = trackData.getFrameCnt();
            this.trail.max = frameCount > 0 ? frameCount - 1 : 0;
        }
        const metadata = this.trackData.getVideoMetadata(0);
        if (metadata) this.renderer.updateLayout(metadata.width, metadata.height);
    }

    getImageAt(idx) {
        if (!this.trackData || idx < 0) return null;

        const rawImgList = this.trackData.getRawImgList(0);
        const backgroundImage = rawImgList[idx];
        if (!backgroundImage) return null;

        const maskLayer = this._generateMaskLayer(
            idx, this.trackData.getConf());
        
        const compositeCanvas = document.createElement('canvas');
        compositeCanvas.width = backgroundImage.width;
        compositeCanvas.height = backgroundImage.height;
        const compositeCtx = compositeCanvas.getContext('2d');

        compositeCtx.drawImage(backgroundImage, 0, 0);

        if (maskLayer) {
            compositeCtx.drawImage(maskLayer, 0, 0, backgroundImage.width, backgroundImage.height);
        }

        return compositeCanvas;
    }

    drawImageAt(idx) {
        this.lastIdx = idx;
        const compositeImage = this.getImageAt(idx);
        if (compositeImage) {
            this.renderer.drawImage(compositeImage);
        }
    }

    _generateMaskLayer(idx, conf) {
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
        
        // 궤적 길이 설정
        const trailLen = this.trail ? parseInt(this.trail.value) : 0;
        const startIdx = Math.max(1, idx - trailLen + 1);

        // 1. 과거 궤적 및 사이 공간 채우기 (기존 masking 로직 유지)
        for (let i = startIdx; i <= idx; i++) {
            const prev = this.trackData.getSelectedBatAt(i - 1);
            const curr = this.trackData.getSelectedBatAt(i);
            this.masking(pixelBuffer, prev, curr, conf, this.trailColor, maskW, maskH);
        }

        // 2. 현재 배트 그리기 (더 진한 색상)
        const nowBat = this.trackData.getSelectedBatAt(idx);
        if (nowBat?.maskConfidenceMap) {
            this.applyMaskToBuffer(pixelBuffer, nowBat.maskConfidenceMap, conf, this.currentBatColor, maskW, maskH);
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
            const rowOffset = y * maskW;
            for (let x = 0; x < maskW; x++) {
                if (row[x] >= threshold) {
                    const idx = (rowOffset + x) * 4;
                    pixelData[idx] = color[0];
                    pixelData[idx+1] = color[1];
                    pixelData[idx+2] = color[2];
                    pixelData[idx+3] = color[3];
                }
            }
        }
    }

    getMaskVertices(maskMap, threshold) {
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
    }

    fillPolygon(pixelData, points, color, canvasW, canvasH) {
        const validPoints = points.filter(p => p !== null);
        if (validPoints.length < 3) return;

        const center = validPoints.reduce((acc, p) => ({ x: acc.x + p.x / validPoints.length, y: acc.y + p.y / validPoints.length }), { x: 0, y: 0 });
        const sortedPoints = validPoints.sort((a, b) => Math.atan2(a.y - center.y, a.x - center.x) - Math.atan2(b.y - center.y, b.x - center.x));

        let minX = Math.max(0, Math.floor(Math.min(...sortedPoints.map(p => p.x))));
        let maxX = Math.min(canvasW - 1, Math.ceil(Math.max(...sortedPoints.map(p => p.x))));
        let minY = Math.max(0, Math.floor(Math.min(...sortedPoints.map(p => p.y))));
        let maxY = Math.min(canvasH - 1, Math.ceil(Math.max(...sortedPoints.map(p => p.y))));

        for (let y = minY; y <= maxY; y++) {
            const rowOffset = y * canvasW;
            for (let x = minX; x <= maxX; x++) {
                if (this.isPointInPolygon(sortedPoints, x, y)) {
                    const idx = (rowOffset + x) * 4;
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