import { Landmarks3D } from "../types";
import { PoseData } from "../core/pose-data";
import { PoseAnalysisTool } from "./pose-analysis-tool";

export class HeightAnalysisTool extends PoseAnalysisTool {
    
    name = 'height';

    locales = {
        en: {
            analysisTools: { height: "Height Analysis" },
            analysisLabels: {
                R_SHOULDER: "Right Shoulder",
                L_SHOULDER: "Left Shoulder",
                R_ELBOW: "Right Elbow",
                L_ELBOW: "Left Elbow",
                R_WRIST: "Right Wrist",
                L_WRIST: "Left Wrist",
                R_HIP: "Right Hip",
                L_HIP: "Left Hip",
                R_KNEE: "Right Knee",
                L_KNEE: "Left Knee",
                R_ANKLE: "Right Ankle",
                L_ANKLE: "Left Ankle"
            }
        },
        ko: {
            analysisTools: { height: "높이 분석" },
            analysisLabels: {
                R_SHOULDER: "오른쪽 어깨",
                L_SHOULDER: "왼쪽 어깨",
                R_ELBOW: "오른쪽 팔꿈치",
                L_ELBOW: "왼쪽 팔꿈치",
                R_WRIST: "오른쪽 손목",
                L_WRIST: "왼쪽 손목",
                R_HIP: "오른쪽 고관절",
                L_HIP: "왼쪽 고관절",
                R_KNEE: "오른쪽 무릎",
                L_KNEE: "왼쪽 무릎",
                R_ANKLE: "오른쪽 발목",
                L_ANKLE: "왼쪽 발목"
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
            let ret: Record<string, number> = {};
            if (landmarks_3d) {
                ret = this.calcHeight(landmarks_3d);
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

    calcHeight(joints: Landmarks3D): Record<string, number> {
        const ret: Record<string, number> = {};

        for (const name of this.items()) {
            if (joints[name]) {
                ret[name] = joints[name][1] * 100;
            }
        }
        return ret;

    }

    items() {
        return ["R_SHOULDER", "L_SHOULDER",
                "R_ELBOW", "L_ELBOW",
                "R_WRIST", "L_WRIST",
                "R_HIP", "L_HIP",
                "R_KNEE", "L_KNEE",
                "R_ANKLE", "L_ANKLE"];
    }
}