import { CVValData, IAnalysisTool } from "@/common/core/cvval-data";
import featureName from "../ constant";
import { PoseData } from "../core/pose-data";

export abstract class PoseAnalysisTool implements IAnalysisTool {
    abstract name: string;

    protected data: Record<string, (number | null)[]> | null = null;

    setData(data: CVValData) {
        if (!data || !data.exist(featureName)) return;
        const poseData = data.get(featureName) as PoseData;

        this.data = this.calc(poseData);
    }

    getResult(idx: number): Record<string, number | null> | null {
        if (this.data == null) return null;
        const ret: Record<string, number | null> = {};
        for (const key of Object.keys(this.data)) {
            ret[key] = this.data[key][idx];
        }
        return ret;
    }

    getResults(): Record<string, (number | null)[]> | null {
        return this.data;
    }
    
    abstract calc(data: PoseData): Record<string, (number | null)[]>;


}