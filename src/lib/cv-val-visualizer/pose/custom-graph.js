import { GraphVisualizer } from "../../visualizer/graph.js"
import { PoseFrameMakerBase } from "./pose-frame-maker-base.js"

export class CustomGraphFrameMaker extends PoseFrameMakerBase {
    constructor(analysisTools) {
        super();
        this.graphVisualizer = null;
        this.analysisTool = null;
        this.analysisTools = analysisTools;
        this.lastDrawIdx = 0;
        this.legendBox = null;
    }

    bindUI(box) {
        // 1. 범례 컨테이너 생성 (캔버스 위에 배치)
        this.legendBox = box.querySelector(".custom-legend-container");

        // 2. 비주얼라이저 초기화
        const canvas = box.querySelector("canvas");
        this.graphVisualizer = new GraphVisualizer(canvas);
        this.graphVisualizer.setDefault();

        // 3. 분석 도구 선택(Select) 이벤트
        const options = box.querySelector("select");
        options.addEventListener("change", () => {
            this.changeAnalysisTool(this.analysisTools[options.value]);
            this.drawImageAt(this.lastDrawIdx);
        });

        this.changeAnalysisTool(this.analysisTools[options.value]);
    }

    changeAnalysisTool(analysisTool) {
        this.analysisTool = analysisTool;
        this.processData();
    }

    setPoseData(data) {
        if (!data) return;
        this.data = data;
        this.processData();
    }

    processData() {
        if (!this.data) return;
        
        // 데이터 계산 및 업데이트 (범례 컨테이너 함께 전달)
        const graphData = this.analysisTool ? this.analysisTool.calc(this.data) : this.data;
        this.graphVisualizer.setData(graphData, this.legendBox);
    }

    drawImageAt(idx) {
        this.lastDrawIdx = idx;
        this.graphVisualizer.drawImageAt(idx);
    }
}