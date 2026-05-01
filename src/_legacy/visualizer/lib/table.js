class Table {
    constructor(instance) {
        this.instance = instance;
        this.setData();
    }

    setData(data) {
        if (data == null) {
            this.instance.innerHTML =
                `<table><tr><td>?</td></tr></table>`
            return;
        }

        let str = '<table><tbody>'
        
        for (let key of Object.keys(data)) {
            str += `<tr><th><e-text key="${key}"></e-text></th>`;
            str += "<td>" + (data[key] != null ? data[key] : "?") + "</td></tr>"
        }

        str += '</tbody></table>'
        
        this.instance.innerHTML = str;
    }
}

export { Table }