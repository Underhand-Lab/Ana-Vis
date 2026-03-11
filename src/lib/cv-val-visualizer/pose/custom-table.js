import { TableVisualizer } from "../../visualizer/table.js"
import { PoseFrameMakerBase } from "./pose-frame-maker-base.js"


class CustomTableFrameMaker extends PoseFrameMakerBase {
    
    constructor(analysisTools) {
        super();
        this.tableVisualizer = null;
        this.analysisTool = null;
        this.lastDrawIdx = 0;
        this.analysisTools = analysisTools;
    }

    bindUI(box) {
        this.tableVisualizer = new TableVisualizer(
            box.getElementsByClassName("table")[0]);
        this.tableVisualizer.setDefault();

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

        let tableData = null;

        if (this.analysisTool == null) tableData = this.data;
        else tableData = this.analysisTool.calc(this.data);

        this.tableVisualizer.setData(tableData);

    }

    drawImageAt(idx) {
        this.lastDrawIdx = idx;
        this.tableVisualizer.drawImageAt(idx);
    }

}

export { CustomTableFrameMaker }