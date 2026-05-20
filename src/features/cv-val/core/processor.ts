import { MediaBunnyVideoToImageList } from '@/common/service/video-to-img-list/media-bunny.js';

import { CVValData } from './cvval-data.js';
import type { IDetector } from '../types/detector.js';
export interface OnProgressCallback {
    onState: (state: string) => void;
    onProgress: (current: number, total: number) => void;
}

/**
 * Processor 클래스: 순수 비즈니스 로직 (OO)
 * React에 의존하지 않으며, 비디오 처리 엔진 역할을 수행합니다.
 */
export class Processor {
    private detector: IDetector | null = null;
    private onProgressCallback: OnProgressCallback | null = null;
    private videoConverter: any; // MediaBunnyVideoConverter의 정확한 타입을 알 수 없는 경우 any 혹은 별도 정의

    constructor() {
        this.videoConverter = new MediaBunnyVideoToImageList();
    }

    setting(detector: IDetector, onProgress: OnProgressCallback): void {
        this.detector = detector;
        this.onProgressCallback = onProgress;
    }

    /**
     * 1단계: 비디오 파일을 프레임 단위의 이미지 리스트(ImageBitmap)로 변환하여 CVValData에 저장합니다.
     */
    async loadVideo(videoList: FileList | Blob[], cvval: CVValData): Promise<void> {
        if (this.onProgressCallback) {
            this.onProgressCallback.onState("video-loading");
        }
        
        const videoFile = videoList[0];
        if (videoFile instanceof File) {
            cvval.setName(videoFile.name);
        }

        const { imageList, metadata } = 
            await this.videoConverter.convert(videoFile);

        cvval.setRawImgList(imageList, 0);
        cvval.setVideoMetadata([metadata]);

        if (this.onProgressCallback) {
            this.onProgressCallback.onState("video-ready");
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }

    /**
     * 2단계: CVValData에 로드된 이미지 리스트를 기반으로 지정된 디텍터를 사용하여 분석을 수행합니다.
     */
    async runInference(type: string, cvval: CVValData, data: any): Promise<void> {
        if (!this.detector) {
            throw new Error("Detector is not set. Call setting() before runInference().");
        }
        
        console.log(cvval);

        const imageList = cvval.getRawImgList(0);
        const metadata = cvval.getVideoMetadata(0);

        if (!imageList || imageList.length === 0) {
            throw new Error("No image list found in CVValData. Load video first.");
        }

        if (this.onProgressCallback) {
            this.onProgressCallback.onState("model-loading");
        }
        await this.detector.initialize();

        if (this.onProgressCallback) {
            this.onProgressCallback.onState("on-process");
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        
        data.initialize([metadata]);

        for (let i = 0; i < imageList.length; i++) {
            if (this.onProgressCallback) {
                this.onProgressCallback.onProgress(
                    i + 1, 
                    imageList.length
                );
            }
            
            const image = imageList[i];
            const frameData = await this.detector.process(image);
            data.addDataAt(0, image, frameData);

            await new Promise(resolve => setTimeout(resolve, 0));
        }

        if (this.onProgressCallback) {
            this.onProgressCallback.onState("after-process");
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        cvval.set(type, data);
    }
}