import { CVValData, IAnalysisTool } from "@/common/core/cvval-data";
import * as Calc from "./velocity";
import { BallData } from "./velocity";
import featureName from "../constant";
import { TrackBallData } from "../core/track-ball-data";

export class BallAnalysisTool implements IAnalysisTool {
    /**
     * 공의 속도와 각도를 계산합니다.
     * @param data 분석에 필요한 데이터를 포함하는 객체
     * @param idx 현재 프레임 인덱스
     */

    public name : string = 'ball-analysis-tool';

    private data : CVValData | null;

    constructor() {
        this.data = null;
    }

    setData(data: CVValData): void {
        this.data = data;
    }

    getResult(idx : number): Record<string, number | null> | null {
        if (!this.data || !this.data.exist(featureName)) return null;

        const data = this.data.get(featureName) as TrackBallData;

        let speed: number | null = null;
        let angle: number | null = null;

        if (idx > 0) {
            const prevBall = data.getSelectedBallAt(idx - 1);
            const currBall = data.getSelectedBallAt(idx);

            // 기존 JS의 '&' 연산자를 논리 연산자 '&&'로 수정하여 안정성 확보
            if (prevBall !== null && currBall !== null) {
                const fps = data.getVideoMetadata(0)?.fps || 30;
                
                const velocityVal = Calc.calcVelocity(prevBall, currBall, fps);
                const angleVal = Calc.calcAngle(prevBall, currBall);

                if (velocityVal !== null) speed = velocityVal;
                if (angleVal !== null) angle = angleVal;
            }
        }

        return {
            "속도(km/h)": speed,
            "각도(도)": angle
        };
    }

    getResults() {
        return null;
    }
}