import { AngleAnalysisTool } from "./angle";
import { PoseData } from "../core/pose-data";
import { PoseAnalysisTool } from "./pose-analysis-tool";

export class AngleVelocityAnalysisTool extends PoseAnalysisTool {
    
    name = 'angleVelocity';
  
    locales = {
        en: {
            analysisTools: { angleVelocity: "Angle Velocity Analysis" },
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
            analysisTools: { angleVelocity: "각속도 분석" },
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