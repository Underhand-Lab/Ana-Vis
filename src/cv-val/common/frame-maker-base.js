export class FrameMakerBase {
    constructor() { }
    setData(data) {
        this.validateAndSet(data);
    }
    validateAndSet(data) {}
    bindUI(element) { }
    drawImageAt(idx) { }
    getImageAt(idx) { return null; }
}