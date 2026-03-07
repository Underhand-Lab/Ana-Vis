import * as lang from "./e-text.js";

class Lang extends HTMLElement {
    constructor() {
        super();
        this.content = this;
        this._key = "";
        this._originalChildren = [];
        this._isReady = false; // 자식 요소 확보 여부 플래그
    }

    static get observedAttributes() {
        return ['key', 'tag'];
    }

    saveOriginalChildren() {
        if (this._isReady || this._originalChildren.length > 0) return;

        // 현재 e-text 내부의 자식들을 가져옴
        const children = Array.from(this.childNodes);
        this._isReady = true; // 이제 준비됨

        if (children.length > 0) {
            this._originalChildren = children.filter(node => {
                if (node.nodeType === Node.ELEMENT_NODE)
                    return node !== this.content;
                if (node.nodeType === Node.TEXT_NODE) {
                    // 비어있지 않거나 공백만 있는 게 아닌 텍스트 노드만 유지
                    return node.textContent.trim().length > 0;
                }
                return false;
            });
        }
    }

    onChange() {
        // 중요: 준비가 안 됐거나 key가 없으면 실행하지 않음
        if (!this._isReady || !this._key) return;

        const translated = lang.getTranslation(this._key);
        if (!this.content) return;

        if (translated.match(/\{\d+\}/)) {
            this.renderFormatted(translated);
        } else {
            this.content.innerHTML = translated;
        }
    }

    renderFormatted(template) {
        const parts = template.split(/(\{\d+\})/g);
        const fragment = document.createDocumentFragment();

        parts.forEach(part => {
            const match = part.match(/^\{(\d+)\}$/);
            if (match) {
                const index = parseInt(match[1]);
                const targetNode = this._originalChildren[index];
                if (targetNode) {
                    // cloneNode(true)를 쓰면 이벤트 리스너가 날아갈 수 있으므로 
                    // 원본을 이동시킵니다. (onChange마다 이 원본은 fragment로 이동함)
                    fragment.appendChild(targetNode);
                }
            } else if (part.length > 0) {
                fragment.appendChild(document.createTextNode(part));
            }
        });

        this.content.innerHTML = '';
        this.content.appendChild(fragment);
    }

    connectedCallback() {
        // DOM에 추가된 후 자식들을 파싱할 시간을 줌
        requestAnimationFrame(() => {
            this.saveOriginalChildren();
            lang.addObserver(this);
        });
    }

    disconnectedCallback() {
        lang.removeObserver(this);
    }

    attributeChangedCallback(attrName, oldVal, newVal) {
        if (oldVal === newVal) return;

        if (attrName === "key") {
            this._key = newVal;
            // 준비된 상태일 때만 onChange 호출
            if (this._isReady) this.onChange();
        } else if (attrName === 'tag') {
            this.renderTag(newVal);
        }
    }

    renderTag(tagName) {
        const currentHTML = this.content ? this.content.innerHTML : this.innerHTML;

        if (!tagName) {
            this.content = this;
            this.innerHTML = currentHTML;
        } else {
            const newElement = document.createElement(tagName);
            this.innerHTML = '';
            this.appendChild(newElement);
            this.content = newElement;
            this.content.innerHTML = currentHTML;
        }
        this.onChange();
    }
}

customElements.define('e-text', Lang);