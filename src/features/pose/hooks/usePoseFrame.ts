import { CVValData } from '@/features/cv-val/core/cvval-data';
import { useState, useCallback, useRef } from 'react';
import featureName from '../ constant';
import { PoseData } from '../core/pose-data';

const POSE_CONNECTIONS = [
    ["L_SHOULDER", "L_ELBOW"], ["L_ELBOW", "L_WRIST"],
    ["R_SHOULDER", "R_ELBOW"], ["R_ELBOW", "R_WRIST"],
    ["L_HIP", "L_KNEE"], ["L_KNEE", "L_ANKLE"], ["L_ANKLE", "L_HEEL"], ["L_HEEL", "L_FOOT_INDEX"],
    ["R_HIP", "R_KNEE"], ["R_KNEE", "R_ANKLE"], ["R_ANKLE", "R_HEEL"], ["R_HEEL", "R_FOOT_INDEX"],
    ["L_SHOULDER", "R_SHOULDER"], ["L_HIP", "R_HIP"], ["L_SHOULDER", "L_HIP"], ["R_SHOULDER", "R_HIP"],
    ["NOSE", "L_SHOULDER"], ["NOSE", "R_SHOULDER"]
];

const CONNECTIONS_COLORS_KEY: Record<string, string> = {
    "L_SHOULDER,L_ELBOW": "COLOR_LEFT_ARM",
    "L_ELBOW,L_WRIST": "COLOR_LEFT_ARM",

    "R_SHOULDER,R_ELBOW": "COLOR_RIGHT_ARM",
    "R_ELBOW,R_WRIST": "COLOR_RIGHT_ARM",

    "L_HIP,L_KNEE": "COLOR_LEFT_LEG",
    "L_KNEE,L_ANKLE": "COLOR_LEFT_LEG",
    "L_ANKLE,L_HEEL": "COLOR_LEFT_LEG",
    "L_HEEL,L_FOOT_INDEX": "COLOR_LEFT_LEG",

    "R_HIP,R_KNEE": "COLOR_RIGHT_LEG",
    "R_KNEE,R_ANKLE": "COLOR_RIGHT_LEG",
    "R_ANKLE,R_HEEL": "COLOR_RIGHT_LEG",
    "R_HEEL,R_FOOT_INDEX": "COLOR_RIGHT_LEG",

    "L_SHOULDER,R_SHOULDER": "COLOR_TORSO",
    "L_HIP,R_HIP": "COLOR_TORSO",
    "L_SHOULDER,L_HIP": "COLOR_TORSO",
    "R_SHOULDER,R_HIP": "COLOR_TORSO",

    "NOSE,L_SHOULDER": "COLOR_HEAD_NECK",
    "NOSE,R_SHOULDER": "COLOR_HEAD_NECK"
};

const CONNECTION_RENDER_ORDER: Record<string, number> = {
    "COLOR_TORSO": 1,
    "COLOR_HEAD_NECK": 1,
    "COLOR_LEFT_LEG": 2,
    "COLOR_RIGHT_LEG": 2,
    "COLOR_LEFT_ARM": 3,
    "COLOR_RIGHT_ARM": 3
};

export interface SkeletonSettings {
    COLOR_LEFT_ARM: string;
    COLOR_RIGHT_ARM: string;
    COLOR_LEFT_LEG: string;
    COLOR_RIGHT_LEG: string;
    COLOR_TORSO: string;
    COLOR_HEAD_NECK: string;
    COLOR_JOINT: string;
    JOINT_STROKE: string;
    lineWidth: number;
    jointShape: string;
    jointRadius: number;
    jointStrokeWidth: number;
    showPose: boolean;
    [key: string]: any; 
}

/**
 * Draws the pose skeleton connections and joints on the canvas.
 */
function drawSkeleton(
    ctx: CanvasRenderingContext2D,
    landmarks: Record<string, number[]>,
    options: SkeletonSettings
) {
    if (!landmarks) return;

    // 1. 뼈대 연결 정보를 우선순위에 따라 정렬
    const sortedConnections = [...POSE_CONNECTIONS].sort((a, b) => {
        const keyA = CONNECTIONS_COLORS_KEY[`${a[0]},${a[1]}`] || CONNECTIONS_COLORS_KEY[`${a[1]},${a[0]}`];
        const keyB = CONNECTIONS_COLORS_KEY[`${b[0]},${b[1]}`] || CONNECTIONS_COLORS_KEY[`${b[1]},${b[0]}`];

        const orderA = CONNECTION_RENDER_ORDER[keyA] || 0;
        const orderB = CONNECTION_RENDER_ORDER[keyB] || 0;

        return orderA - orderB;
    });

    // 2. 정렬된 순서대로 뼈대(선) 그리기
    ctx.lineWidth = options.lineWidth || 4;
    ctx.lineCap = 'round';

    sortedConnections.forEach(([start, end]) => {
        const p1 = landmarks[start];
        const p2 = landmarks[end];

        if (p1 && p2 && p1.length >= 2 && p2.length >= 2) {
            const colorKey = CONNECTIONS_COLORS_KEY[`${start},${end}`] || CONNECTIONS_COLORS_KEY[`${end},${start}`];
            ctx.strokeStyle = options[colorKey] || "rgba(255,255,255,1)";

            ctx.beginPath();
            ctx.moveTo(p1[0] * ctx.canvas.width, p1[1] * ctx.canvas.height);
            ctx.lineTo(p2[0] * ctx.canvas.width, p2[1] * ctx.canvas.height);
            ctx.stroke();
        }
    });

    const radius = options.jointRadius !== undefined ? options.jointRadius : 4;
    const strokeWidth = options.jointStrokeWidth !== undefined ? options.jointStrokeWidth : 2;
    const shape = options.jointShape || 'circle';

    ctx.fillStyle = options["COLOR_JOINT"] || "rgba(255,255,255,1)";
    ctx.strokeStyle = options["JOINT_STROKE"] || "rgba(255,255,255,1)";
    ctx.lineWidth = strokeWidth;

    for (let key in landmarks) {
        const [nx, ny] = landmarks[key];
        const x = nx * ctx.canvas.width;
        const y = ny * ctx.canvas.height;

        ctx.beginPath();
        if (shape === 'rect') {
            ctx.rect(x - radius, y - radius, radius * 2, radius * 2);
        } else {
            ctx.arc(x, y, radius, 0, 2 * Math.PI);
        }
        ctx.fill();
        ctx.stroke();
    }
}

export const usePoseFrame = (data: CVValData | null) => {
    const [options, setOptions] = useState<SkeletonSettings>({
        COLOR_LEFT_ARM: "rgba(255,0,0,1)",
        COLOR_RIGHT_ARM: "rgba(0,255,0,1)",
        COLOR_LEFT_LEG: "rgba(0,0,255,1)",
        COLOR_RIGHT_LEG: "rgba(255,255,0,1)",
        COLOR_TORSO: "rgba(255,0,255,1)",
        COLOR_HEAD_NECK: "rgba(0,255,255,1)",
        COLOR_JOINT: "rgba(255,255,255,1)",
        JOINT_STROKE: "rgba(255,255,255,1)",
        lineWidth: 2,
        jointShape: 'circle',
        jointRadius: 4,
        jointStrokeWidth: 2,
        showPose: true,
    });

    const offscreenRef = useRef<HTMLCanvasElement | null>(null);
    const resultCanvasRef = useRef<HTMLCanvasElement | null>(null);

    const getPoseLayer = useCallback((idx: number) => {
        if (!data || !data.exist(featureName)|| idx < 0) return null;

        const poseData = data.get(featureName) as PoseData;
        const targetIdx = 0; 
        const rawImgList = data.getRawImgList(targetIdx);
        const landmark2dList = poseData.getLandmarks2dList(targetIdx);

        const image = rawImgList[idx];
        const landmarks = landmark2dList[idx];

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

        if (options.showPose !== false && landmarks) {
            drawSkeleton(offCtx, landmarks, options);
        }

        return offCanvas;
    }, [data, options]);

    return { options, setOptions, getPoseLayer };
};