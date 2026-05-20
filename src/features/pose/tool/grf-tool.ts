import { PoseFrameData, JointCoordinate } from "../types";
import { PoseData } from "../core/pose-data";
import { PoseAnalysisTool } from "./pose-analysis-tool";

/**
 * 신체 분절 질량 및 CoM 비율 (Winter's Table 기반 단순화)
 */
interface BodySegment {
    massRatio: number;
    comRatio: { x: number; y: number; z: number };
    proximalJoint: keyof PoseFrameData['keypoints'];
    distalJoint: keyof PoseFrameData['keypoints'];
}

/**
 * 수직 가속도를 계산할 축 인덱스
 * HeightAnalysisTool이 index 1(y)을 사용하므로 y를 수직축으로 가정합니다.
 */
const VERTICAL_AXIS: 'x' | 'y' | 'z' = 'y';

const ANTHROPOMETRIC_DATA: Record<string, BodySegment> = {
    HEAD: { massRatio: 0.081, comRatio: { x: 0.5, y: 0.5, z: 0.5 }, proximalJoint: 'NOSE', distalJoint: 'NOSE' },
    TORSO: { massRatio: 0.497, comRatio: { x: 0.5, y: 0.5, z: 0.5 }, proximalJoint: 'L_HIP', distalJoint: 'R_SHOULDER' },
    UPPER_ARM_L: { massRatio: 0.028, comRatio: { x: 0.5, y: 0.5, z: 0.436 }, proximalJoint: 'L_SHOULDER', distalJoint: 'L_ELBOW' },
    UPPER_ARM_R: { massRatio: 0.028, comRatio: { x: 0.5, y: 0.5, z: 0.436 }, proximalJoint: 'R_SHOULDER', distalJoint: 'R_ELBOW' },
    FOREARM_L: { massRatio: 0.016, comRatio: { x: 0.5, y: 0.5, z: 0.430 }, proximalJoint: 'L_ELBOW', distalJoint: 'L_WRIST' },
    FOREARM_R: { massRatio: 0.016, comRatio: { x: 0.5, y: 0.5, z: 0.430 }, proximalJoint: 'R_ELBOW', distalJoint: 'R_WRIST' },
    HAND_L: { massRatio: 0.006, comRatio: { x: 0.5, y: 0.5, z: 0.506 }, proximalJoint: 'L_WRIST', distalJoint: 'L_WRIST' },
    HAND_R: { massRatio: 0.006, comRatio: { x: 0.5, y: 0.5, z: 0.506 }, proximalJoint: 'R_WRIST', distalJoint: 'R_WRIST' },
    THIGH_L: { massRatio: 0.100, comRatio: { x: 0.5, y: 0.5, z: 0.433 }, proximalJoint: 'L_HIP', distalJoint: 'L_KNEE' },
    THIGH_R: { massRatio: 0.100, comRatio: { x: 0.5, y: 0.5, z: 0.433 }, proximalJoint: 'R_HIP', distalJoint: 'R_KNEE' },
    SHANK_L: { massRatio: 0.046, comRatio: { x: 0.5, y: 0.5, z: 0.433 }, proximalJoint: 'L_KNEE', distalJoint: 'L_ANKLE' },
    SHANK_R: { massRatio: 0.046, comRatio: { x: 0.5, y: 0.5, z: 0.433 }, proximalJoint: 'R_KNEE', distalJoint: 'R_ANKLE' },
    FOOT_L: { massRatio: 0.014, comRatio: { x: 0.5, y: 0.5, z: 0.500 }, proximalJoint: 'L_ANKLE', distalJoint: 'L_ANKLE' },
    FOOT_R: { massRatio: 0.014, comRatio: { x: 0.5, y: 0.5, z: 0.500 }, proximalJoint: 'R_ANKLE', distalJoint: 'R_ANKLE' },
};

const calculateCoM = (poseFrame: PoseFrameData): { x: number, y: number, z: number } | null => {
    let tX = 0, tY = 0, tZ = 0;
    let totalMassRatio = 0;

    for (const segmentName in ANTHROPOMETRIC_DATA) {
        const segment = ANTHROPOMETRIC_DATA[segmentName];
        const pJoint = poseFrame.keypoints[segment.proximalJoint];
        const dJoint = poseFrame.keypoints[segment.distalJoint];

        if (pJoint && dJoint && (pJoint.score ?? 1) > 0.5 && (dJoint.score ?? 1) > 0.5) {
            tX += (pJoint.x + (dJoint.x - pJoint.x) * segment.comRatio.x) * segment.massRatio;
            tY += (pJoint.y + (dJoint.y - pJoint.y) * segment.comRatio.y) * segment.massRatio;
            tZ += (pJoint.z + (dJoint.z - pJoint.z) * segment.comRatio.z) * segment.massRatio;
            totalMassRatio += segment.massRatio;
        }
    }
    return totalMassRatio > 0 
        ? { x: tX / totalMassRatio, y: tY / totalMassRatio, z: tZ / totalMassRatio } 
        : null;
};

const lowPassFilter = (data: (number | null)[], windowSize: number): (number | null)[] => {
    const filteredData: (number | null)[] = new Array(data.length).fill(null);
    for (let i = 0; i < data.length; i++) {
        let sum = 0, count = 0;
        for (let j = Math.max(0, i - Math.floor(windowSize / 2)); j < Math.min(data.length, i + Math.ceil(windowSize / 2)); j++) {
            if (data[j] !== null) {
                sum += data[j]!;
                count++;
            }
        }
        filteredData[i] = count > 0 ? sum / count : null;
    }
    return filteredData;
};

/**
 * 지면반력(GRF) 계산 도구 객체
 */
export class GRFAnalysisTool extends PoseAnalysisTool {
    
    name = 'grf';
    title = 'grf'; // Use name as title for translation key lookup

    calc(data: PoseData, options?: { userWeight?: number }) {
        const frames = data.getFrameCnt();
        const fps = data.getFPS(); // Use data.getFPS()
        const dt = 1 / fps;
        const userWeightKg = options?.userWeight ?? 70;
        const gravity = 9.81;

        const comPositions: ({ x: number, y: number, z: number } | null)[] = [];
        for (let i = 0; i < frames; i++) {
            comPositions.push(calculateCoM(data.getPose(i)));
        }

        // 가속도 계산 (2차 차분)
        const accelerations: (number | null)[] = new Array(frames).fill(null);
        for (let i = 2; i < frames; i++) {
            const p2 = comPositions[i]?.[VERTICAL_AXIS];
            const p1 = comPositions[i - 1]?.[VERTICAL_AXIS];
            const p0 = comPositions[i - 2]?.[VERTICAL_AXIS];
            
            if (p2 !== null && p1 !== null && p0 !== null) {
                // 좌표계에 따라 가속도 방향 보정이 필요할 수 있습니다.
                accelerations[i] = (p2! - 2 * p1! + p0!) / (dt * dt);
            }
        }

        const filteredAcc = lowPassFilter(accelerations, 5);
        
        const totalGRF: (number | null)[] = [];
        const leftGRF: (number | null)[] = [];
        const rightGRF: (number | null)[] = [];

        for (let i = 0; i < frames; i++) {
            const acc = filteredAcc[i];
            const pose = data.getPose(i);
            const com = comPositions[i];

            if (acc !== null && com) {
                const total = userWeightKg * (gravity + acc);
                totalGRF.push(total);

                // 발 위치를 이용한 분배 비율 계산
                const lAnkle = pose.keypoints['L_ANKLE'];
                const rAnkle = pose.keypoints['R_ANKLE'];

                if (lAnkle && rAnkle) {
                    // 1. 단순 높이 비교 (지면에서 떨어졌는지 확인)
                    // Landmarks3D에서 Y가 큰 값이 아래쪽인 경우 (이미지 좌표계 기준)
                    const heightThreshold = 0.05; 
                    const lHeight = lAnkle.y;
                    const rHeight = rAnkle.y;

                    let leftRatio = 0.5;
                    const span = Math.abs(rAnkle.x - lAnkle.x);

                    if (span > 0.01) {
                        // CoM의 X 위치가 양발 사이 어디에 있는지에 따른 비율 (지렛대 원리)
                        leftRatio = (rAnkle.x - com.x) / (rAnkle.x - lAnkle.x);
                    }
                    
                    const clampedRatio = Math.max(0, Math.min(1, leftRatio));
                    leftGRF.push(total * clampedRatio);
                    rightGRF.push(total * (1 - clampedRatio));
                } else {
                    leftGRF.push(total * 0.5);
                    rightGRF.push(total * 0.5);
                }
            } else {
                totalGRF.push(null);
                leftGRF.push(null);
                rightGRF.push(null);
            }
        }

        return { 
            "Total_GRF_N": totalGRF,
            "Left_GRF_N": leftGRF,
            "Right_GRF_N": rightGRF 
        };
    }
}

export const grfTool = new GRFAnalysisTool();