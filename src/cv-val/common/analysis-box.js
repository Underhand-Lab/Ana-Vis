import { BoxList } from "../../easy-h/ui/box-list.js";

export class AnalysisBox {
    constructor() {
        this.frameMakers = [];
        this.data = null;
        this.boxList = null;
        this.makeConfig = {};
    }

    async registerFrameMaker(type, config) {

        const bindUIFunc = config.bindUI ? config.bindUI : null;
        let html = '';
        
        if (config.src) {
            const response = (await fetch(config.src));

            if (!response.ok) {
                throw new Error(response.statusText);
            }
            html = await response.text();
        }
        else if (config.html) {
            html = config.html;
        }

        this.makeConfig[type] = {
            create: config.create,
            bindUI: bindUIFunc,
            html: html
        };
    }

    async addFrame(key) {
        const config = this.makeConfig[key];

        if (!config) return;

        this.addFrameMaker(config.html, config.create(), config.bindUI);

        window.scrollTo({
            top: document.body.scrollHeight,
            behavior: 'smooth'
        });
    }

    async initDefault(keys) {

        for (const key of keys) {
            const config = this.makeConfig[key];

            this.addFrameMaker(config.html, config.create(), config.bindUI);
        }

    }

    bindUI(element, options = {}) {
        this.slider = element.getElementById('frameSlider');
        this.onUpdateCallback = options.onUpdate;

        // 모바일 스크롤 간섭 방지
        if (this.slider) {
            this.slider.style.touchAction = "none";
            this.slider.addEventListener('input', () => this.updateImage());
        }

        this.boxList = new BoxList(element.getElementById("boxes"));
    }

    setData(data) {
        if (!data) return;
        this.data = data;

        const frameCount = this.data.getFrameCnt();
        if (this.slider) {
            this.slider.max = frameCount > 0 ? frameCount - 1 : 0;
        }

        this.frameMakers.forEach(fm => fm.setData(this.data));
        this.updateImage();
    }

    addFrameMaker(html, frameMaker, bindUIFunc) {

        const box = this.boxList.addBox(html, () => {
            this.frameMakers =
                this.frameMakers.filter(fm => fm !== frameMaker);
        });

        box.className = 'container neumorphism';

        // 버튼 생성 및 초기화
        const closeBtn = box.querySelectorAll('.remove-box-button')[0];
        const minimaxBtn = document.createElement('button');
        minimaxBtn.className = "minimax-box-button";
        minimaxBtn.innerText = "⧉";
        box.prepend(minimaxBtn);

        const opacityMember = [closeBtn, minimaxBtn].filter(Boolean);
        const minimaxElements = box.querySelectorAll("*[minimaxTarget]");

        // 1. 버튼 가시성 로직 (모바일 & 데스크톱 통합)
        const setBtnOpacity = (val) => opacityMember.forEach(b => b.style.opacity = val);

        for (const btn of opacityMember) {
            btn.style.transition = "opacity 0.3s ease";
            btn.style.opacity = 0;
        }

        // 데스크톱 호버
        box.addEventListener('mouseenter', () => setBtnOpacity(1));
        box.addEventListener('mouseleave', () => setBtnOpacity(0));

        // 모바일 터치 대응: 박스 터치 시 버튼 보이기 (3초 후 사라짐)
        box.addEventListener('touchstart', () => {
            setBtnOpacity(1);
            clearTimeout(box._hideTimer);
            box._hideTimer = setTimeout(() => setBtnOpacity(0), 3000);
        }, { passive: true });

        // 2. 최소/최대화 로직 (Grid 방식)
        let isMax = true;
        minimaxBtn.addEventListener('click', () => {
            if (isMax) {
                minimaxBtn.innerText = "⛶";

                for (const e of minimaxElements) {
                    e.style.display = "none";
                }
                isMax = false;
                return;
            }

            minimaxBtn.innerText = "⧉";
            for (const e of minimaxElements) {
                e.style.display = null;
            }
            box.style.padding = null;
            isMax = true;

        });

        // FrameMaker 바인딩
        frameMaker.bindUI(box);
        if (bindUIFunc) bindUIFunc(box, frameMaker);

        this.frameMakers.push(frameMaker);
        frameMaker.setData(this.data);
        frameMaker.drawImageAt(this.nowIdx());
    }

    nowIdx() {
        return this.slider ? parseInt(this.slider.value, 10) : 0;
    }

    updateImage() {
        const idx = this.nowIdx();
        this.frameMakers.forEach(fm => fm.drawImageAt(idx));
        if (this.onUpdateCallback) this.onUpdateCallback(idx);
    }
}