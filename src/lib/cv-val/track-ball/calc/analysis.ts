import * as Calc from "./velocity";
import { BallData } from "./velocity";

interface AnalysisData {
    getFrameCnt(): number;
    getSelectedBallAt(idx: number): BallData | null;
    getVideoMetadata(idx: number): { fps: number };
}

interface AnalysisResult {
    "속도(km/h)": string;
    "각도(도)": string;
}

export class BallAnalysisTool {
    /**
     * 공의 속도와 각도를 계산합니다.
     * @param data 분석에 필요한 데이터를 포함하는 객체
     * @param idx 현재 프레임 인덱스
     */
    calc(data: AnalysisData | null | undefined, idx: number): AnalysisResult | undefined {
        if (!data) return;

        let speed: string = '?';
        let angle: string = '?';

        if (idx > 0) {
            const prevBall = data.getSelectedBallAt(idx - 1);
            const currBall = data.getSelectedBallAt(idx);

            // 기존 JS의 '&' 연산자를 논리 연산자 '&&'로 수정하여 안정성 확보
            if (prevBall !== null && currBall !== null) {
                const fps = data.getVideoMetadata(0)?.fps || 30;
                
                const velocityVal = Calc.calcVelocity(prevBall, currBall, fps);
                const angleVal = Calc.calcAngle(prevBall, currBall);

                if (velocityVal !== null) speed = velocityVal.toFixed(2);
                if (angleVal !== null) angle = angleVal.toFixed(2);
            }
        }

        return {
            "속도(km/h)": speed,
            "각도(도)": angle
        };
    }
}