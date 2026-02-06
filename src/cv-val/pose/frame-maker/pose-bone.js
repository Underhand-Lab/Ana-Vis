import { PoseFrameMakerBase } from "./pose-frame-maker-base.js";
import { CanvasRenderer } from "../../canvas-renderer.js";
import { PoseVisualizer } from "./pose-visualizer.js";

export class PoseBoneFrameMaker extends PoseFrameMakerBase {
    
    constructor() {
        super();
        this.targetIdx = 0;
        this.renderer = new CanvasRenderer();
        this.visualizer = new PoseVisualizer();

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
        }

        for (const key of Object.keys(dict)) {

            const e = element.querySelectorAll(dict[key])[0];

            if (e == null) {
                continue;
            }

            e.addEventListener('change', () => {
                this.visualizer.setColor(key, e.value);
                this.drawImageAt(this.lastDrawIdx);
            });
        }

    }

    setPoseData(data) {
        if (data == null) {
            return;
        }

        this.data = data;
        this.rawImgList = data.getRawImgList(this.targetIdx);
        this.landmark2dList = data.getLandmarks2dList(this.targetIdx);

        const firstImg = this.rawImgList[0];

        if (firstImg == null) {
            return;
        }

        this.renderer.updateLayout(firstImg.width, firstImg.height);
        this.offscreenCanvas.width = firstImg.width;
        this.offscreenCanvas.height = firstImg.height;

    }

    setColor(key, value) {
        this.visualizer.setColor(key, value);
    }

    _generatePoseLayer(idx) {
        const landmarks = this.landmark2dList[idx];

        if (landmarks == null) {
            return null;
        }

        const { width, height } = this.offscreenCanvas;
        
        this.offscreenCtx.clearRect(0, 0, width, height);

        // 분리된 Visualizer 클래스에 그리기 위임
        this.visualizer.draw(this.offscreenCtx,
            landmarks, width, height);

        return this.offscreenCanvas;
    }

    drawImageAt(idx) {

        if (this.data == null) {
            return;
        }

        this.lastDrawIdx = idx;

        const image = this.rawImgList[idx];
        if (image == null) {
            return;
        }

        this.renderer.drawImage(image);

        const poseLayer = this._generatePoseLayer(idx);

        // 3. 레이어 합성
        if (poseLayer) {
            this.renderer.drawLayer(poseLayer);
        }
    }
}