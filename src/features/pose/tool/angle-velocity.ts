import { AngleAnalysisTool } from "./angle";
import { PoseData } from "../core/pose-data";
import { PoseAnalysisTool } from "./pose-analysis-tool";

export class AngleVelocityAnalysisTool extends PoseAnalysisTool {
    
    name = 'angle-velocity-analysis-plugin';
  
    private angleCalcer: AngleAnalysisTool;

    constructor() {
        super();
        this.angleCalcer = new AngleAnalysisTool();
    }

    calc(data: PoseData): Record<string, (number | null)[]> {
        const t = this.angleCalcer.calc(data);
        const labels = Object.keys(t);

        const ret: Record<string, (number | null)[]> = {};

        for (const name of labels) {
            ret[name] = [null];
            
            for (let i = 1; i < t[name].length; i++) {
                const prev = t[name][i - 1];
                const curr = t[name][i];
                if (prev !== null && curr !== null) {
                        ret[name].push(
                            Math.abs(curr - prev));
                    }
            }
        }

        return ret;

    }
}