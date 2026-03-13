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
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    sortedConnections.forEach(([start, end]) => {
        const p1 = landmarks[start];
        const p2 = landmarks[end];

        if (p1 && p2) {
            const colorKey = CONNECTIONS_COLORS_KEY[`${start},${end}`] || CONNECTIONS_COLORS_KEY[`${end},${start}`];
            ctx.strokeStyle = colorPalette[colorKey] || "white";

            ctx.beginPath();
            ctx.moveTo(p1[0] * width, p1[1] * height);
            ctx.lineTo(p2[0] * width, p2[1] * height);
            ctx.stroke();
        }
    });

}

function drawJoint(ctx, landmarks, width, height, colorPalette) {

    ctx.fillStyle = colorPalette["COLOR_HEAD_NECK"];
    ctx.strokeStyle = colorPalette["JOINT_STROKE"];
    ctx.lineWidth = 2;

    for (let key in landmarks) {
        const [nx, ny] = landmarks[key];
        const x = nx * width;
        const y = ny * height;

        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
    }

}

export const usePoseVisualize = (poseData, renderer) => {
    const [options, setOptions] = useState({
        COLOR_LEFT_ARM: "#ff0000",
        COLOR_RIGHT_ARM: "#0000ff",
        COLOR_LEFT_LEG: "#ffff00",
        COLOR_RIGHT_LEG: "#00ffff",
        COLOR_TORSO: "#00ff00",
        COLOR_HEAD_NECK: "#ffffff",
        JOINT_STROKE: "#ff0000"

    })

    const offscreenRef = useRef(null);

    useEffect(() => {
        if (!offscreenRef.current) {
            offscreenRef.current = document.createElement('canvas');
        }
    }, []);


    const drawImageAt = useCallback((idx) => {
        if (!poseData || idx < 0 || !renderer) return;

        const targetIdx = 0; // 컴포넌트 내부 설정값
        const rawImgList = poseData.getRawImgList(targetIdx);
        const landmark2dList = poseData.getLandmarks2dList(targetIdx);


        const image = rawImgList[idx];
        const landmarks = landmark2dList[idx];

        if (!image) return;

        const offCanvas = offscreenRef.current;
        const offCtx = offCanvas.getContext('2d');
        const { width, height } = offCanvas;
        // 캔버스 크기 동기화
        if (offCanvas.width !== image.width || offCanvas.height !== image.height) {
            offCanvas.width = image.width;
            offCanvas.height = image.height;
            renderer.updateLayout(image.width, image.height);
        }

        // 합성 그리기
        offCtx.clearRect(0, 0, width, height);
        offCtx.drawImage(image, 0, 0, width, height);
        if (landmarks) {
            drawConnection(offCtx, landmarks, width, height, options);
            drawJoint(offCtx, landmarks, width, height, options);
        }

        // 메인 캔버스에 출력
        renderer.drawImage(offCanvas);
    });

    return { options, setOptions, drawImageAt }
}