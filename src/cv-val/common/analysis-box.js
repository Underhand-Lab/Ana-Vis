import { BoxList } from "../../easy-h/ui/box-list.js";

export class AnalysisBox {
    constructor() {
        this.frameMakers = [];
        this.data = null;
        this.boxList = null;
    }

    bindUI(element, options = {}) {
        this.slider = element.getElementById('frameSlider');
        this.onUpdateCallback = options.onUpdate; // 외부에서 주입된 추가 로직
        this.slider.addEventListener('input', () => {
            this.updateImage();
        });
        this.boxList = new BoxList(element.getElementById("boxes"));
    }

    setData(data) {
        if (data == null) return;

        this.data = data;

        const frameCount = this.data.getFrameCnt();
        this.slider.max = frameCount > 0 ? frameCount - 1 : 0;

        for (let i = 0; i < this.frameMakers.length; i++) {
            this.frameMakers[i].setData(this.data);
        }
        this.updateImage();
    }

    addFrameMaker(src, frameMaker, bindUIFunc) {

        return new Promise((resolve, reject) => {
            this.boxList.addBoxTemplate(src, () => {
                this.frameMakers = this.frameMakers.filter(
                    fm => fm !== frameMaker);

            }, (box) => {
                box.className = 'container neumorphism';
                
                const closeBtn = box.querySelectorAll('.remove-box-button')[0];
                const minimaxBtn = document.createElement('button');
                minimaxBtn.className = "minimax-box-button";
                minimaxBtn.innerText = "⧉";
                box.prepend(minimaxBtn);
                
                const opacityMember = [closeBtn, minimaxBtn];

                for (const btn of opacityMember) {
                    btn.style.transition = "opacity 0.3s ease";
                    btn.style.opacity = 0;
                }

                const minimaxElement = box.querySelectorAll("*[minimaxTarget]");

                let isMax = true;

                box.addEventListener('mouseenter', () => {
                    for (const btn of opacityMember) {
                        btn.style.opacity = 1;
                    }
                });

                box.addEventListener('mouseleave', () => {
                    for (const btn of opacityMember) {
                        btn.style.opacity = 0;
                    }
                });

                minimaxBtn.addEventListener('click', () => {
                    if (isMax) {
                        minimaxBtn.innerText = "⛶";

                        for (const e of minimaxElement) {
                            e.style.display = "none";
                        }
                        isMax = false;
                        return;

                    }
                    minimaxBtn.innerText = "⧉";
                    for (const e of minimaxElement) {
                        e.style.display = null;
                    }
                    box.style.padding = null;
                    isMax = true;

                });

                frameMaker.bindUI(box);

                if (bindUIFunc) {
                    bindUIFunc(box, frameMaker);
                }

                this.frameMakers.push(frameMaker);

                frameMaker.setData(this.data);
                frameMaker.drawImageAt(this.nowIdx());

                resolve();
            });
        });

    }

    nowIdx() {
        if (this.slider == null) return 0;
        return parseInt(this.slider.value, 10);
    }

    updateImage() {
        const idx = this.nowIdx();
        for (let i = 0; i < this.frameMakers.length; i++) {
            this.frameMakers[i].drawImageAt(idx);
        }
        if (this.onUpdateCallback) {
            this.onUpdateCallback(idx);
        }
    }
}