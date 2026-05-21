import { useState, useCallback, useRef } from 'react';

import { CVValData } from '@cv-val/data/cvval-data';

import featureName from '../ constant';
import { PoseData } from '../core/pose-data';

export interface GRFSettings {
    showGRF: boolean;
    grfScale: number;
}

/**
 * Draws an arrow on the canvas.
 */
const drawArrow = (ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number, color: string, width: number) => {
    const headLength = 10;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);
    
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
};

/**
 * Draws Ground Reaction Force (GRF) arrows on the canvas.
 */
export function drawGRF(
    ctx: CanvasRenderingContext2D,
    idx: number,
    data: CVValData,
    poseData: PoseData,
    options: GRFSettings
) {
    const grfTool = data.getAnalysisTool('pose', 'grf');

    if (!grfTool) return;

    const grfData = grfTool.getResult(idx);

    if (!grfData) return;

    const leftGRF = grfData["Left_GRF_N"];
    const rightGRF = grfData["Right_GRF_N"];
    const landmarks2d = poseData.getLandmarks2dList(0)[idx];
    const scale = options.grfScale || 0.1;

    if (!landmarks2d) return;

    const lKnee = landmarks2d['L_KNEE'];
    const rKnee = landmarks2d['R_KNEE'];

    const renderArrow = (jointKey: string, value: number | null, color: string) => {
        
        if (value === null || value === undefined || isNaN(value) || value <= 0) return;
        const joint = landmarks2d[jointKey];

        if (!joint) return;

        const startX = joint[0] * ctx.canvas.width;
        const startY = joint[1] * ctx.canvas.height;

        ctx.beginPath();
        ctx.arc(startX, startY, 5, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.closePath();

        const target = jointKey === 'L_ANKLE' ? lKnee : rKnee;
        if (target) {
            const dx = (target[0] * ctx.canvas.width) - startX;
            const dy = (target[1] * ctx.canvas.height) - startY;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len > 0) {
                const endX = startX + (dx / len) * (value * scale);
                const endY = startY + (dy / len) * (value * scale);
                drawArrow(ctx, startX, startY, endX, endY, color, 5);
            }
        }
    };

    renderArrow('L_ANKLE', leftGRF, 'rgba(255, 0, 0, 0.8)');
    renderArrow('R_ANKLE', rightGRF, 'rgba(0, 255, 0, 0.8)');
}

export const useGRFFrame = (data: CVValData | null) => {
    const [options, setOptions] = useState<GRFSettings>({
        showGRF: true,
        grfScale: 0.1,
    });

    const offscreenRef = useRef<HTMLCanvasElement | null>(null);

    const getGRFLayer = useCallback((idx: number) => {
        if (!data || !data.exist(featureName)|| idx < 0) return null;

        const poseData = data.get(featureName) as PoseData;
        const targetIdx = 0; 
        const rawImgList = data.getRawImgList(targetIdx);

        const image = rawImgList[idx];
        if (!image) return null;

        if (!offscreenRef.current) offscreenRef.current = document.createElement('canvas');
        const offCanvas = offscreenRef.current;
        
        if (offCanvas.width !== image.width || offCanvas.height !== image.height) {
            offCanvas.width = image.width;
            offCanvas.height = image.height;
        }

        const offCtx = offCanvas.getContext('2d');
        if (!offCtx) return null;

        offCtx.clearRect(0, 0, offCanvas.width, offCanvas.height);

        if (options.showGRF) {
            drawGRF(offCtx, idx, data, poseData, options);
        }

        return offCanvas;
    }, [data, options]);

    return { options, setOptions, getGRFLayer };
};