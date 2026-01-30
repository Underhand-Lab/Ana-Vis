import * as Calc from "./velocity.js"

class BallAnalysisTool {

    calc(data, idx) {
        if (!data) return;
        
        const frameCnt = data.getFrameCnt();

        let speed = '?';
        let angle = '?'

        if (idx > 0) {
            const prevBall = data.getSelectedBallAt(idx - 1);
            const currBall = data.getSelectedBallAt(idx);

            if (prevBall != null & currBall != null) {

                speed = Calc.calcVelocity(
                        prevBall,
                        currBall,
                        data.getVideoMetadata(0)["fps"]).toFixed(2);

                angle = Calc.calcAngle(prevBall, currBall).toFixed(2);
                
            }
        }

        return {
            "속도(km/h)": speed,
            "각도(도)": angle
        };
    }
}

export { BallAnalysisTool }