import { GraphVisualizer } from "../../../visualizer/graph.js"
import { PoseFrameMakerBase } from "./pose-frame-maker-base.js"

export class CustomGraphFrameMaker extends PoseFrameMakerBase {

    constructor(analysisTools) {
        super();
        this.graphVisualizer = null;
        this.analysisTool = null;
        this.lastDrawIdx = 0;
        this.analysisTools = analysisTools;
    }

    bindUI(box) {
        this.graphVisualizer = new GraphVisualizer(
            box.querySelectorAll("canvas")[0]);
        this.graphVisualizer.setDefault();

        const options = box.querySelectorAll("select")[0];

        options.addEventListener("change", () => {
            this.changeAnalysisTool(
                this.analysisTools[options.value]);
            this.drawImageAt(this.lastDrawIdx);
        });

        this.changeAnalysisTool(
            this.analysisTools[options.value]);

    }

    changeAnalysisTool(analysisTool) {
        this.analysisTool = analysisTool;
        this.processData();
    }

    setPoseData(data) {

        if (data == null) return;

        this.data = data;
        this.processData();

    }

    processData() {

        if (this.data == null)
            return;

        let graphData = null;

        if (this.analysisTool == null) graphData = this.data;
        else graphData = this.analysisTool.calc(this.data);

        this.graphVisualizer.setData(graphData);

    }

    drawImageAt(idx) {
        this.lastDrawIdx = idx;
        this.graphVisualizer.drawImageAt(idx);
    }
}