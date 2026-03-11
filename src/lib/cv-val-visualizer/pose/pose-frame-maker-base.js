import { FrameMakerBase } from "../../cv-val/common/frame-maker-base.js";

export class PoseFrameMakerBase extends FrameMakerBase {
    setPoseData(data) {
        
    }
    validateAndSet(data) {
        this.setPoseData(data);
    }
}