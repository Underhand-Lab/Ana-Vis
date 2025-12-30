import { loadFile } from "../load-file.js"

class ImportHTML extends HTMLElement {
    constructor() {
        super();
    }

    static get observedAttributes() {
        return ['src'];
    }

    connectedCallback() {

    }

    disconnectedCallback() {
        console.log("ImportHTML");

    }

    attributeChangedCallback(attrName, oldVal, newVal) {
        if (attrName == "src") {
            loadFile(newVal).then((html) => {
                this.innerHTML = html;
            }).catch(error => {
                console.error(error);
                this.innerHTML = `<p style="color:red;">로딩 실패</p>`;
            });
        }
    }

}

customElements.define('import-html', ImportHTML);