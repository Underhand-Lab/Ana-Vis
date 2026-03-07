import { loadFile } from "./load-file.js"
import * as marked from 'https://cdn.jsdelivr.net/npm/marked@17.0.1/+esm'

class ImportMarkdown extends HTMLElement {
    constructor() {
        super();
    }

    static get observedAttributes() {
        return ['src'];
    }

    connectedCallback() {

    }

    disconnectedCallback() {

    }

    attributeChangedCallback(attrName, oldVal, newVal) {
        if (attrName == "src") {
            loadFile(newVal).then((markdownText) => {
                this.innerHTML = marked.parse(markdownText);
            }).catch(error => {
                console.error(error);
                this.innerHTML = `<p style="color:red;">로딩 실패</p>`;
            });
        }
    }

}

customElements.define('import-markdown', ImportMarkdown);