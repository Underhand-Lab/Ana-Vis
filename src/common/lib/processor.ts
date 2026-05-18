import { CVValData } from '../core/cvval-data.js';
import { MediaBunnyVideoToImageList } from './video-to-img-list/media-bunny.js';

export interface OnProgressCallback {
    onState: (state: string) => void;
    onProgress: (current: number, total: number) => void;
}

export interface Detector {
    initialize(): Promise<void>;
    process(image: any): Promise<any>;
}

export class Processor {
    private detector: Detector | null = null;
    private onProgressCallback: OnProgressCallback | null = null;
    private videoConverter: any; // MediaBunnyVideoConverter의 정확한 타입을 알 수 없는 경우 any 혹은 별도 정의

    constructor() {
        this.videoConverter = new MediaBunnyVideoToImageList();
    }

    setting(ballDetector: Detector, onProgress: OnProgressCallback): void {
        this.detector = ballDetector;
        this.onProgressCallback = onProgress;
    }

    async processVideo(videoList: FileList | Blob[], type: string, cvval: CVValData, data: any): Promise<CVValData> {
        if (!this.detector) {
            throw new Error("Detector is not set. Call setting() before processVideo().");
        }

        if (this.onProgressCallback) {
            this.onProgressCallback.onState("model-loading");
        }
        await this.detector.initialize();

        if (this.onProgressCallback) {
            this.onProgressCallback.onState("process-ready");
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        
        const { imageList, metadata } = 
            await this.videoConverter.convert(videoList[0]);

        if (this.onProgressCallback) {
            this.onProgressCallback.onState("on-process");
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        
        let frameIndex = 0;
        data.initialize([metadata]);
        
        cvval.setRawImgList(imageList, 0);
        cvval.setVideoMetadata([metadata]);

        for (const image of imageList) {
            if (this.onProgressCallback) {
                this.onProgressCallback.onProgress(
                    frameIndex + 1, 
                    imageList.length
                );
            }
            
            const frameData = await this.detector.process(image);
            data.addDataAt(0, image, frameData);

            await new Promise(resolve => setTimeout(resolve, 0));
            frameIndex++;
        }

        if (this.onProgressCallback) {
            this.onProgressCallback.onState("after-process");
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        cvval.set(type, data);
        
        return cvval;
    }
}