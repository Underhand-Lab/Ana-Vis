import { useState, useCallback, useRef } from 'react';
import { PoseSettings } from '../modules/PoseVideoModule';

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

const renderOrder: Record<string, number> = {
    "COLOR_TORSO": 1,
    "COLOR_HEAD_NECK": 1,
    "COLOR_LEFT_LEG": 2,
    "COLOR_RIGHT_LEG": 2,
    "COLOR_LEFT_ARM": 3,
    "COLOR_RIGHT_ARM": 3
};

export function drawConnection(
    ctx: CanvasRenderingContext2D, 
    landmarks: Record<string, number[]>, 
    width: number, 
    height: number, 
    colorPalette: PoseSettings
) {
    if (!landmarks) return;

    // 1. 뼈대 연결 정보를 우선순위에 따라 정렬
    const sortedConnections = [...POSE_CONNECTIONS].sort((a, b) => {
        const keyA = CONNECTIONS_COLORS_KEY[`${a[0]},${a[1]}`] || CONNECTIONS_COLORS_KEY[`${a[1]},${a[0]}`];
        const keyB = CONNECTIONS_COLORS_KEY[`${b[0]},${b[1]}`] || CONNECTIONS_COLORS_KEY[`${b[1]},${b[0]}`];

        const orderA = renderOrder[keyA] || 0;
        const orderB = renderOrder[keyB] || 0;

        return orderA - orderB; // 낮은 순위(몸통)가 배열 앞으로 옴
    });

    // 2. 정렬된 순서대로 뼈대(선) 그리기
    ctx.lineWidth = colorPalette.lineWidth || 4;
    ctx.lineCap = 'round';

    sortedConnections.forEach(([start, end]) => {
        const p1 = landmarks[start];
        const p2 = landmarks[end];

        if (p1 && p2) {
            const colorKey = CONNECTIONS_COLORS_KEY[`${start},${end}`] || CONNECTIONS_COLORS_KEY[`${end},${start}`];
            ctx.strokeStyle = colorPalette[colorKey] || "rgba(255,255,255,1)"; // Use normalized color string directly

            ctx.beginPath();
            ctx.moveTo(p1[0] * width, p1[1] * height);
            ctx.lineTo(p2[0] * width, p2[1] * height);
            ctx.stroke();
        }
    });

}

function drawJoint(
    ctx: CanvasRenderingContext2D, 
    landmarks: Record<string, number[]>, 
    width: number, 
    height: number, 
    colorPalette: PoseSettings
) {

    const radius = colorPalette.jointRadius !== undefined ? colorPalette.jointRadius : 4;
    const strokeWidth = colorPalette.jointStrokeWidth !== undefined ? colorPalette.jointStrokeWidth : 2;
    const shape = colorPalette.jointShape || 'circle';

    ctx.fillStyle = colorPalette["COLOR_JOINT"] || "rgba(255,255,255,1)";
    ctx.strokeStyle = colorPalette["JOINT_STROKE"] || "rgba(255,255,255,1)";
    ctx.lineWidth = strokeWidth;

    for (let key in landmarks) {
        const [nx, ny] = landmarks[key];
        const x = nx * width;
        const y = ny * height;

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

interface PoseDataInterface {
    getRawImgList: (idx: number) => any[];
    getLandmarks2dList: (idx: number) => any[];
}

export const usePoseVisualize = (poseData: PoseDataInterface | null) => {
    // renderer 인자는 현재 getPoseLayer에서 직접 캔버스를 생성하므로 로직상 필수는 아니지만,
    // 모듈에서의 호출 규약을 맞추기 위해 추가되었습니다.
    const [options, setOptions] = useState<PoseSettings>({
        COLOR_LEFT_ARM: "rgba(255,0,0,1)",
        COLOR_RIGHT_ARM: "rgba(0,255,0,1)",
        COLOR_LEFT_LEG: "rgba(0,0,255,1)",
        COLOR_RIGHT_LEG: "rgba(255,255,0,1)",
        COLOR_TORSO: "rgba(255,0,255,1)",
        COLOR_HEAD_NECK: "rgba(0,255,255,1)",
        COLOR_JOINT: "rgba(255,255,255,1)",
        JOINT_STROKE: "rgba(255,255,255,1)",
        lineWidth: 2,
        showBackground: true,
        jointShape: 'circle',
        jointRadius: 4,
        jointStrokeWidth: 2,
    });

    const offscreenRef = useRef<HTMLCanvasElement | null>(null);
    const resultCanvasRef = useRef<HTMLCanvasElement | null>(null);

    // ✅ 포즈 스켈레톤 레이어만 생성하는 함수
    const getPoseLayer = useCallback((idx: number) => {
        if (!poseData || idx < 0 || !poseData.getRawImgList) return null;

        const targetIdx = 0; 
        const rawImgList = poseData.getRawImgList(targetIdx);
        const landmark2dList = poseData.getLandmarks2dList(targetIdx);

        const image = rawImgList[idx];
        const landmarks = landmark2dList[idx];

        if (!image) return null;

        // 오프스크린 캔버스 준비 (배경 없이 투명한 레이어)
        if (!offscreenRef.current) offscreenRef.current = document.createElement('canvas');
        const offCanvas = offscreenRef.current;
        
        if (offCanvas.width !== image.width || offCanvas.height !== image.height) {
            offCanvas.width = image.width;
            offCanvas.height = image.height;
        }

        const offCtx = offCanvas.getContext('2d');
        if (!offCtx) return null;
        const { width, height } = offCanvas;

        // 레이어 초기화 (투명)
        offCtx.clearRect(0, 0, width, height);

        // 스켈레톤 그리기
        if (landmarks) {
            drawConnection(offCtx, landmarks, width, height, options);
            drawJoint(offCtx, landmarks, width, height, options);
        }

        // ✅ 성능 최적화: 매번 생성하지 않고 ref에 저장된 캔버스를 재사용
        if (!resultCanvasRef.current) resultCanvasRef.current = document.createElement('canvas');
        const resultCanvas = resultCanvasRef.current;
        resultCanvas.width = width;
        resultCanvas.height = height;
        
        const resultCtx = resultCanvas.getContext('2d');
        if (resultCtx) {
            resultCtx.clearRect(0, 0, width, height);
            resultCtx.drawImage(offCanvas, 0, 0);
        }

        return resultCanvas;
    }, [poseData, options]);

    return { options, setOptions, getPoseLayer };
};