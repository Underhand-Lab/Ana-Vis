class PopUp extends HTMLElement {
    constructor() {
        super();
    }

    static get observedAttributes() {
        return ['window-class', 'background-class',
            'trigger-id', 'open'];
    }

    connectedCallback() {
        this.window = document.createElement('div');

        this.window.innerHTML = this.innerHTML;
        this.innerHTML = '';
        this.appendChild(this.window);

        if (this.windowClassName) {
            this.window.className = this.windowClassName;
        }

        const closeBtn = this.
            getElementsByClassName('close-btn')[0];
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeAction();
            });
        }
    }

    openAction() {
        this.style = "display:block;"
    }

    closeAction() {
        this.style = "display:none;"
    }

    disconnectedCallback() {
        console.log("ImportHTML");

    }

    attributeChangedCallback(attrName, oldVal, newVal) {
        if (attrName == "open") {
            if (newVal == "open") {
                this.openAction();
            }
            else {
                this.closeAction();
            }
            return;
        }
        if (attrName == "window-class") {
            this.windowClassName = newVal;
            if (!this.window) return;
            this.window.className = newVal;
            return;
        }
        if (attrName == "background-class") {
            this.className = newVal;
            return;
            
        }
        if (attrName == "trigger-id") {
            const openBtn = document.getElementById(newVal);
            if (!openBtn) return;
            openBtn.addEventListener('click', ()=> {
                this.setAttribute("open", "open");
            });
        }
    }


}

customElements.define('pop-up', PopUp);