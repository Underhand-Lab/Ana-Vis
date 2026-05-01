import * as Table from "./lib/table.js"
import { IVisualizer } from "./visualizer.interface.js"

class TableVisualizer extends IVisualizer {

    constructor(instance) {
        super();
        this.targetIdx = 0;
        this.table = new Table.Table(instance);

    }

    setData(data) {

        this.data = data;

    }

    setDefault() {

    }

    drawImageAt(idx) {

        if (this.data == null) return;
        
        let d = {}

        for (let key of Object.keys(this.data)) {
            if (this.data[key][idx] == null) {
                d[key] = null;
                continue;
            }
            d[key] = this.data[key][idx].toFixed(2);
        }

        this.table.setData(d);
    }

}

export { TableVisualizer }      