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

    addFrameMaker(src, frameMaker) {

        return new Promise((resolve, reject) => {
            this.boxList.addBoxTemplate(src, () => {
                this.frameMakers = this.frameMakers.filter(
                    fm => fm !== frameMaker);

            }, (box) => {
                box.className = 'container neumorphism';
                frameMaker.bindUI(box);

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
        for (let i = 0; i < this.frameMakers.length; i++) {
            this.frameMakers[i].drawImageAt(this.nowIdx());
        }
    }
}