import { magVec, subVec } from "@common/lib/math/vector.js"
import { Landmarks3D } from "../types";
import { PoseData } from "../core/pose-data";
import { PoseAnalysisTool } from "./pose-analysis-tool";

export class VelocityAnalysisTool extends PoseAnalysisTool {
    
    name = 'velocity';

    calc(data: PoseData): Record<string, (number | null)[]> {
        const results: Record<string, (number | null)[]> = {};

        for (const name of this.items()) {
            results[name] = []
        }
        
        const landmarks3dList = data.getLandmarks3d();
        let beforeLandmarks3d = landmarks3dList[0];
        
        for (const landmarks_3d of landmarks3dList) {
            let ret: Record<string, number> = {};
            if (beforeLandmarks3d != null &&
                landmarks_3d != null) {
                ret = this.calcVelocity(
                    beforeLandmarks3d, landmarks_3d);
            }
            for (const name of this.items()) {
                if (name in ret) {
                    results[name].push(ret[name]);
                    continue;
                }
                results[name].push(null);
            }
            beforeLandmarks3d = landmarks_3d;
        }

        // PandasDataFrame 대신 일반 자바스크립트 배열 반환
        return results;
    }

    calcVelocity(before: Landmarks3D, after: Landmarks3D): Record<string, number> {
        const ret: Record<string, number> = {};

        for (const name of this.items()) {
            if (!(name in before) || !(name in after)) {
                continue;
            }
            ret[name] = magVec(subVec(before[name], after[name])) * 100;
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