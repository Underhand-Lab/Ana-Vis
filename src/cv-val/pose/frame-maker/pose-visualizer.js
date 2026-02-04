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

// ... POSE_CONNECTIONS 및 CONNECTIONS_COLORS_KEY 정의는 동일 ...

export class PoseVisualizer {
    constructor() {
        this.colorPalette = {
            "COLOR_LEFT_ARM": "#ff0000",
            "COLOR_RIGHT_ARM": "#0000ff",
            "COLOR_LEFT_LEG": "#ffff00",
            "COLOR_RIGHT_LEG": "#00ffff",
            "COLOR_TORSO": "#00ff00",
            "COLOR_HEAD_NECK": "#ffffff",
            "JOINT_STROKE": "#ff0000"
        };
        this.lineWidth = 8;
        this.jointRadius = 8;

        // --- 그리기 우선순위 정의 (낮을수록 먼저 그림) ---
        this.renderOrder = {
            "COLOR_TORSO": 1,
            "COLOR_HEAD_NECK": 1,
            "COLOR_LEFT_LEG": 2,
            "COLOR_RIGHT_LEG": 2,
            "COLOR_LEFT_ARM": 3,
            "COLOR_RIGHT_ARM": 3
        };
    }

    setColor(key, colorValue) {
        if (this.colorPalette[key] !== undefined) {
            this.colorPalette[key] = colorValue;
        }
    }

    draw(ctx, landmarks, width, height) {
        if (!landmarks) return;

        // 1. 뼈대 연결 정보를 우선순위에 따라 정렬
        const sortedConnections = [...POSE_CONNECTIONS].sort((a, b) => {
            const keyA = CONNECTIONS_COLORS_KEY[`${a[0]},${a[1]}`] || CONNECTIONS_COLORS_KEY[`${a[1]},${a[0]}`];
            const keyB = CONNECTIONS_COLORS_KEY[`${b[0]},${b[1]}`] || CONNECTIONS_COLORS_KEY[`${b[1]},${b[0]}`];
            
            const orderA = this.renderOrder[keyA] || 0;
            const orderB = this.renderOrder[keyB] || 0;
            
            return orderA - orderB; // 낮은 순위(몸통)가 배열 앞으로 옴
        });

        // 2. 정렬된 순서대로 뼈대(선) 그리기
        ctx.lineWidth = this.lineWidth;
        ctx.lineCap = 'round';

        sortedConnections.forEach(([start, end]) => {
            const p1 = landmarks[start];
            const p2 = landmarks[end];

            if (p1 && p2) {
                const colorKey = CONNECTIONS_COLORS_KEY[`${start},${end}`] || CONNECTIONS_COLORS_KEY[`${end},${start}`];
                ctx.strokeStyle = this.colorPalette[colorKey] || "white";

                ctx.beginPath();
                ctx.moveTo(p1[0] * width, p1[1] * height);
                ctx.lineTo(p2[0] * width, p2[1] * height);
                ctx.stroke();
            }
        });

        // 3. 관절(점) 그리기 (관절은 항상 뼈대 위에 위치)
        ctx.fillStyle = this.colorPalette["COLOR_HEAD_NECK"];
        ctx.strokeStyle = this.colorPalette["JOINT_STROKE"];
        ctx.lineWidth = 2;

        for (let key in landmarks) {
            const [nx, ny] = landmarks[key];
            const x = nx * width;
            const y = ny * height;

            ctx.beginPath();
            ctx.arc(x, y, this.jointRadius, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
        }
    }
}