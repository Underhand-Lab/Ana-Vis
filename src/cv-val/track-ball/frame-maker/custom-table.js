import * as Table from "../../../visualizer/lib/table.js"
import { BallFrameMakerBase } from "./ball-frame-maker-base.js";

class CustomTableFrameMaker extends BallFrameMakerBase {
    
    constructor() {
        super();
        this.table = null;
        this.analysisTool = null;
    }

    bindUI(box) {
        const newDiv = box.getElementsByClassName("table")[0];
        this.table = new Table.Table(newDiv);
    }

    changeAnalysisTool(analysisTool) {
        this.analysisTool = analysisTool;
        this.setData(this.data);
    }

    setData(data) {
        
        if (data == null) return;

        this.data = data;

    }

    drawImageAt(idx) {
        if (this.data == null) return;
        
        let d = {}

        if (this.analysisTool == null) {
            d = this.data[idx];
        }
        else {
            d = this.analysisTool.calc(this.data, idx);
        }

        this.table.setData(d);
    }

}

export { CustomTableFrameMaker }