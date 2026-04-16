import { useState, useCallback, useRef, useEffect } from 'react';

const POSE_CONNECTIONS = [
    ["L_SHOULDER", "L_ELBOW"], ["L_ELBOW", "L_WRIST"],
    ["R_SHOULDER", "R_ELBOW"], ["R_ELBOW", "R_WRIST"],
    ["L_HIP", "L_KNEE"], ["L_KNEE", "L_ANKLE"], ["L_ANKLE", "L_HEEL"], ["L_HEEL", "L_FOOT_INDEX"],
    ["R_HIP", "R_KNEE"], ["R_KNEE", "R_ANKLE"], ["R_ANKLE", "R_HEEL"], ["R_HEEL", "R_FOOT_INDEX"],
    ["L_SHOULDER", "R_SHOULDER"], ["L_HIP", "R_HIP"], ["L_SHOULDER", "L_HIP"], ["R_SHOULDER", "R_HIP"],
    ["NOSE", "L_SHOULDER"], ["NOSE", "R_SHOULDER"]
];

const CONNECTIONS_COLORS_KEY = {
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

// Helper function to convert various color formats to rgba string
// NOTE: For better reusability, this function should ideally be in a shared utility file.
const normalizeColorToRgba = (colorStr) => {
    // Handle named colors (basic support)
    const namedColors = {
        "red": "rgba(255,0,0,1)", "green": "rgba(0,128,0,1)", "blue": "rgba(0,0,255,1)",
        "white": "rgba(255,255,255,1)", "black": "rgba(0,0,0,1)", "yellow": "rgba(255,255,0,1)",
        "cyan": "rgba(0,255,255,1)", "magenta": "rgba(255,0,255,1)", "transparent": "rgba(0,0,0,0)"
    };
    if (namedColors[colorStr.toLowerCase()]) {
        return namedColors[colorStr.toLowerCase()];
    }

    // Handle hex colors #RRGGBB or #RGB
    const hexMatch = colorStr.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
    if (hexMatch) {
        let hex = hexMatch[1];
        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return `rgba(${r},${g},${b},1)`;
    }

    // Handle rgb(r,g,b) or rgba(r,g,b,a)
    const rgbaMatch = colorStr.match(/rgba?\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})(?:,\s*(0?\.\d+|1|0))?\)/i);
    if (rgbaMatch) {
        const r = parseInt(rgbaMatch[1], 10);
        const g = parseInt(rgbaMatch[2], 10);
        const b = parseInt(rgbaMatch[3], 10);
        let a = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1;
        a = Math.max(0, Math.min(1, a)); // Clamp alpha between 0 and 1
        return `rgba(${r},${g},${b},${a})`;
    }

    // Fallback for invalid input
    return "rgba(255,255,255,1)"; // Default to white opaque
};

const renderOrder = {
    "COLOR_TORSO": 1,
    "COLOR_HEAD_NECK": 1,
    "COLOR_LEFT_LEG": 2,
    "COLOR_RIGHT_LEG": 2,
    "COLOR_LEFT_ARM": 3,
    "COLOR_RIGHT_ARM": 3
};

export function drawConnection(ctx, landmarks, width, height, colorPalette) {
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

function drawJoint(ctx, landmarks, width, height, colorPalette) {

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

export const usePoseVisualize = (poseData) => {
    const [options, setOptions] = useState({
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
    });

    const offscreenRef = useRef(null);

    // ✅ 포즈 스켈레톤 레이어만 생성하는 함수
    const getPoseLayer = (idx) => {
        if (!poseData || idx < 0) return null;

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
        const { width, height } = offCanvas;

        // 레이어 초기화 (투명)
        offCtx.clearRect(0, 0, width, height);

        // 스켈레톤 그리기
        if (landmarks) {
            drawConnection(offCtx, landmarks, width, height, options);
            drawJoint(offCtx, landmarks, width, height, options);
        }

        // 독립적인 캔버스 객체로 복사하여 반환
        const layerCanvas = document.createElement('canvas');
        layerCanvas.width = width;
        layerCanvas.height = height;
        layerCanvas.getContext('2d').drawImage(offCanvas, 0, 0);

        return layerCanvas;
    };

    return { options, setOptions, getPoseLayer };
};