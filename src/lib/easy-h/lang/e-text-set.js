import { loadFile } from "../load-file.js";
import * as lang from "./e-text.js"

class LangSet extends HTMLElement {

    async connectedCallback() {
        const key = this.getAttribute('key');
        const src = this.getAttribute('src');
        if (key && src) {
            lang.registerPendingSource(src); // 로딩 시작 보고
            try {
                const response = await fetch(src);
                const data = await response.json();
                lang.addDictionary(key, data, src);
            } catch (e) {
                console.error(`사전 로드 실패: ${src}`, e);
            } finally {
                lang.resolvePendingSource(src);
            }
        }
    }
}

customElements.define('e-text-set', LangSet);