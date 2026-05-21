import { magVec, dotVec, subVec } from "@shared/lib/math/vector"
import { Vector3 } from "@shared/lib/math/vector";

import { Landmarks3D } from "../types";
import { PoseData } from "../core/pose-data";
import { PoseAnalysisTool } from "./pose-analysis-tool";

const jointCalcParameter: Record<string, string[]> = {
    "R_ELBOW": ["R_SHOULDER", "R_ELBOW", "R_WRIST"],
    "L_ELBOW": ["L_SHOULDER", "L_ELBOW", "L_WRIST"],
    "R_SHOULDER": ["L_SHOULDER", "R_SHOULDER", "R_ELBOW"],
    "L_SHOULDER": ["R_SHOULDER", "L_SHOULDER", "L_ELBOW"],
    "R_KNEE": ["R_HIP", "R_KNEE", "R_ANKLE"],
    "L_KNEE": ["L_HIP", "L_KNEE", "L_ANKLE"],
    "R_WRIST": ["R_ELBOW", "R_WRIST", "R_PINKY"],
    "L_WRIST": ["L_ELBOW", "L_WRIST", "L_PINKY"]
}

export class AngleAnalysisTool extends PoseAnalysisTool {
    
    name = 'angle';

    locales = {
        en: {
            analysisTools: { angle: "Angle Analysis" },
            analysisLabels: {
                R_ELBOW: "Right Elbow",
                L_ELBOW: "Left Elbow",
                R_SHOULDER: "Right Shoulder",
                L_SHOULDER: "Left Shoulder",
                R_KNEE: "Right Knee",
                L_KNEE: "Left Knee",
                R_WRIST: "Right Wrist",
                L_WRIST: "Left Wrist",
                SHOULDER: "Shoulder",
                PELVIS: "Pelvis",
                TWIST: "Twist"
            }
        },
        ko: {
            analysisTools: { angle: "각도 분석" },
            analysisLabels: {
                R_ELBOW: "오른쪽 팔꿈치",
                L_ELBOW: "왼쪽 팔꿈치",
                R_SHOULDER: "오른쪽 어깨",
                L_SHOULDER: "왼쪽 어깨",
                R_KNEE: "오른쪽 무릎",
                L_KNEE: "왼쪽 무릎",
                R_WRIST: "오른쪽 손목",
                L_WRIST: "왼쪽 손목",
                SHOULDER: "어깨",
                PELVIS: "골반",
                TWIST: "회전"
            }
        }
    };

    calc(data: PoseData): Record<string, (number | null)[]> {
        const results: Record<string, (number | null)[]> = {};

        for (const name of this.items()) {
            results[name] = []
        }

        const landmarks3dList = data.getLandmarks3d();

        for (const landmarks_3d of landmarks3dList) {
            let ret: Record<string, number | null> = {};
            if (landmarks_3d) {
                ret = this.calcJoints(landmarks_3d);
            }
            for (const name of this.items()) {
                if (name in ret) {
                    results[name].push(ret[name]);
                    continue;
                }
                results[name].push(null);
            }
        }

        // PandasDataFrame 대신 일반 자바스크립트 배열 반환
        return results;
    }

    calcJoints(joints: Landmarks3D): Record<string, number | null> {
        const ret: Record<string, number | null> = {};

        for (const key in jointCalcParameter) {
            const angle = this._calcJoints(joints, jointCalcParameter[key]);
            if (angle !== null) ret[key] = angle;
        }
        ret["SHOULDER"] = this._calcJointsXZ(joints,
                                ["L_SHOULDER", "R_SHOULDER"]);
        ret["PELVIS"] = this._calcJointsXZ(joints,
                                ["L_HIP", "R_HIP"]);
        
        if (ret["SHOULDER"] != null && ret["PELVIS"] != null) {
            const angle_body_twist = ret["SHOULDER"] - ret["PELVIS"];
            ret["TWIST"] = (angle_body_twist + 180) % 360 - 180;
        }

        return ret;

    }

    _calcJoints(joints: Landmarks3D, parameterList: string[]): number | null {
        for (const p of parameterList) {
            if (!(p in joints)) return null;
        }

        const vec1 = subVec(joints[parameterList[0]],
                            joints[parameterList[1]]) as Vector3;
                            
        const vec2 = subVec(joints[parameterList[1]],
                            joints[parameterList[2]]) as Vector3;

        return calculateAngle(vec1, vec2);
    }

    _calcJointsXZ(joints: Landmarks3D, parameterList: string[]): number | null {
        for (const p of parameterList) {
            if (!(p in joints)) return null;
        }

        let vec1 = subVec(joints[parameterList[0]],
                        joints[parameterList[1]]) as Vector3;
        vec1[1] = 0;
        const vec2: Vector3 = [10, 0, 0];
        
        const angleRadians = Math.atan2(
            vec1[0] * vec2[2] - vec1[2] * vec2[0],
            vec1[0] * vec2[0] + vec1[2] * vec2[2]);
        return angleRadians * 180 / Math.PI;
    }

    items() {
        return ["R_ELBOW", "L_ELBOW",
                "R_SHOULDER", "L_SHOULDER",
                "R_KNEE", "L_KNEE",
                "R_WRIST", "L_WRIST",
                "SHOULDER", "PELVIS", "TWIST"];
    }
}

function calculateAngle(vec1: Vector3, vec2: Vector3): number {
    // ndarray를 사용하여 벡터 연산
    const dotProduct = dotVec(vec1, vec2);

    const norm1 = magVec(vec1);
    const norm2 = magVec(vec2);

    const cosineAngle = dotProduct / (norm1 * norm2);
    const angleRadians = Math.acos(Math.max(-1, Math.min(1, cosineAngle)));

    return angleRadians * 180 / Math.PI;
}

// 기타 calculate_angle_3, calculate_angle_4 함수도 유사하게 구현