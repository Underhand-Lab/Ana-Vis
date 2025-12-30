import * as lang from "./e-text.js"

class ETextSelect extends HTMLElement {

    constructor() {
        super();
        this.select = document.createElement('select');
        ['value', 'selectedIndex', 'disabled'].forEach(prop => {
            Object.defineProperty(this, prop, {
                get: () => this.select[prop],
                set: (val) => { this.select[prop] = val; }
            });
        });
    }

    onChange() {
        this.select.querySelectorAll('option[data-lang-key]').forEach(opt => {
            const key = opt.getAttribute('data-lang-key');
            if (key) opt.text = lang.getTranslation(key);
        });
    }

    connectedCallback() {
        if (this.querySelector('select')) return; // 이미 있으면 중단

        // 기존에 HTML에 적어둔 <option>들을 select 안으로 옮김
        while (this.firstChild) {
            this.select.appendChild(this.firstChild);
        }
        this.appendChild(this.select);
        lang.addObserver(this);
    }

    disconnectedCallback() {
        lang.removeObserver(this);
    }

    // 옵션을 추가할 때 사전을 참조하여 텍스트만 주입
    addOption(key, value) {
        const opt = document.createElement('option');
        opt.value = value;
        opt.text = lang.getTranslation(key);
        this.select.add(opt);
    }
}

customElements.define('e-text-select', ETextSelect);