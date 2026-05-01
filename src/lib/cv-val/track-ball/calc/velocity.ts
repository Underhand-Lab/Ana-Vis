export interface BallData {
    bbox: [number, number, number, number];
}

const REAL_BALL_DIAMETER_M = 0.074;

export function calcVelocity(
    ballData1: BallData | null,
    ballData2: BallData | null,
    fps: number
): number | null {
    if (!ballData1 || !ballData2) return null;

    const [x1, y1, width1, height1] = ballData1.bbox;
    const [x2, y2, width2, height2] = ballData2.bbox;

    const dist_x = x2 - x1 + (width2 - width1) / 2;
    const dist_y = y2 - y1 + (height2 - height1) / 2;

    const pixelDistance = Math.sqrt(dist_x ** 2 + dist_y ** 2);

    // 2. 속도 계산 (km/h)
    const meter_per_pixel = REAL_BALL_DIAMETER_M / width2;
    const actualDistance = pixelDistance * meter_per_pixel;

    const speed_mps = actualDistance * fps;

    return speed_mps * 3.6;
}

export function calcAngle(
    ballData1: BallData | null,
    ballData2: BallData | null
): number | null {
    if (!ballData1 || !ballData2) return null;

    const [x1, y1, width1, height1] = ballData1.bbox;
    const [x2, y2, width2, height2] = ballData2.bbox;

    let dist_x = x2 - x1 + (width2 - width1) / 2;
    const dist_y = y2 - y1 + (height2 - height1) / 2;

    if (dist_x < 0) {
        dist_x = -dist_x;
    }

    const angle = (Math.atan2(dist_y, dist_x) * 180) / Math.PI;

    return -angle;
}