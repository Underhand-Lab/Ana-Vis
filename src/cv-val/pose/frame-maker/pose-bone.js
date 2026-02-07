import { PoseFrameMakerBase } from "./pose-frame-maker-base.js";
import { CanvasRenderer } from "../../canvas-renderer.js";
import { PoseVisualizer } from "./pose-visualizer.js";

export class PoseBoneFrameMaker extends PoseFrameMakerBase {
    
    constructor() {
        super();
        this.targetIdx = 0;
        this.renderer = new CanvasRenderer();
        this.visualizer = new PoseVisualizer();

        // 합성을 위한 내부용 Offscreen Canvas
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCtx = this.offscreenCanvas.getContext('2d');
        this.lastDrawIdx = 0;
    }
    
    bindUI(element) {
        const newCanvas = element.querySelectorAll("canvas")[0];
        this.renderer.setCanvas(newCanvas);

        const dict = {
            "COLOR_LEFT_ARM": ".color-left-arm",
            "COLOR_RIGHT_ARM": ".color-right-arm",
            "COLOR_LEFT_LEG": ".color-left-leg",
            "COLOR_RIGHT_LEG": ".color-right-leg",
            "COLOR_TORSO": ".color-torso",
            "COLOR_HEAD_NECK": ".color-head",
            "JOINT_STROKE": ".color-joint"
        };

        for (const key of Object.keys(dict)) {
            const e = element.querySelectorAll(dict[key])[0];
            if (e == null) continue;

            e.addEventListener('change', () => {
                this.visualizer.setColor(key, e.value);
                this.drawImageAt(this.lastDrawIdx);
            });
        }
    }

    setPoseData(data) {
        if (data == null) return;

        this.data = data;
        this.rawImgList = data.getRawImgList(this.targetIdx);
        this.landmark2dList = data.getLandmarks2dList(this.targetIdx);

        const firstImg = this.rawImgList[0];
        if (firstImg == null) return;

        this.renderer.updateLayout(firstImg.width, firstImg.height);
        this.offscreenCanvas.width = firstImg.width;
        this.offscreenCanvas.height = firstImg.height;
    }

    getImageAt(idx) {

        if (this.data == null) return null;

        const backgroundImage = this.rawImgList[idx];
        const landmarks = this.landmark2dList[idx];

        if (backgroundImage == null) return null;

        const { width, height } = this.offscreenCanvas;

        this.offscreenCtx.clearRect(0, 0, width, height);

        this.offscreenCtx.drawImage(backgroundImage, 0, 0, width, height);

        if (landmarks) {
            this.visualizer.draw(this.offscreenCtx, landmarks, width, height);
        }
        
        return this.offscreenCanvas;
    }

    drawImageAt(idx) {
        this.lastDrawIdx = idx;

        // getImageAt을 통해 합성된 이미지를 가져옴
        const compositeImage = this.getImageAt(idx);

        if (compositeImage) {
            // 렌더러는 이제 '무엇이 그려졌는지' 신경 쓰지 않고 전달받은 이미지만 출력
            this.renderer.drawImage(compositeImage);
        }
    }
}