import * as Table from "../../../visualizer/lib/table.js"

class CustomTableFrameMaker {
    
    constructor() {
        this.table = null;
        this.analysisTool = null;
    }

    setInstance(canvas) {
        this.table = new Table.Table(canvas);
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