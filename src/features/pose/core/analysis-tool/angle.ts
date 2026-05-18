import { magVec, dotVec, subVec } from "@common/lib/math/vector"
import { PoseData, Landmarks3D } from "../types";
import { Vector3 } from "@/common/types/vector";

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

export class AngleAnalysisTool {
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