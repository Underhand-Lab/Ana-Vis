import * as lang from "./e-text.js"

class ETextSelect extends HTMLElement {
    constructor() {
        super();
        this.select = document.createElement('select');
        this._hiddenOptions = []; // 숨겨진 옵션들을 임시 보관할 저장소

        ['value', 'selectedIndex', 'disabled'].forEach(prop => {
            Object.defineProperty(this, prop, {
                get: () => this.select[prop],
                set: (val) => { this.select[prop] = val; }
            });
        });
    }

    onChange() {
        // 기존 옵션들과 보관 중인 숨겨진 옵션들 모두 번역 갱신
        const allOptions = [...this.select.options, ...this._hiddenOptions];
        allOptions.forEach(opt => {
            const key = opt.getAttribute('data-lang-key');
            if (key) opt.text = lang.getTranslation(key);
        });
    }

    connectedCallback() {
        if (this.contains(this.select)) return;

        while (this.firstChild) {
            this.select.appendChild(this.firstChild);
        }
        this.select.id = `${this.id}-select`;
        this.appendChild(this.select);
        lang.addObserver(this);
    }

    disconnectedCallback() {
        lang.removeObserver(this);
    }

    addOption(key, value) {
        const opt = document.createElement('option');
        opt.value = value;
        opt.text = lang.getTranslation(key);
        this.select.add(opt);
    }
}

customElements.define('e-text-select', ETextSelect);