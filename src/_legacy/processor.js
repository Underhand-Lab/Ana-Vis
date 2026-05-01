import { FFMPEGVideoConverter } from '../video-to-img-list/ffmpeg.js'

export class Processor {

    constructor() {
        this.onProgressCallback = null;
        this.videoConverter = new FFMPEGVideoConverter();
    }

    setting(onProgress) {
        this.onProgressCallback = onProgress;
    }

    async processVideo(target, videoList, initialize, func) {

        if (this.onProgressCallback) {
            this.onProgressCallback.onState("process-ready");
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        await this.videoConverter.load();

        const videoMetaData = 
            await this.videoConverter.getVideoMetadata(videoList[0]);
        const imageList =
            await this.videoConverter.convert(videoList[0]);

        if (this.onProgressCallback) {
            this.onProgressCallback.onState("on-process");
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        // --- 2단계: 저장된 프레임 리스트를 순회하며 포즈 처리 및 데이터 저장 ---
        await initialize();

        let frameIndex = 0;

        for (const image of imageList) {
            func(image);
            await new Promise(resolve => setTimeout(resolve, 0));
            frameIndex++;
        }

        if (this.onProgressCallback) {
            this.onProgressCallback.onState("after-process");
            await new Promise(resolve => setTimeout(resolve, 0));
        }

    }

}