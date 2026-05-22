import { MediabunnyImageListToVideo } from "@shared/service/image-list-to-video/media-bunny";
import { CVValData } from './cvval-data';
import { IAnalysisData } from './cvval-types';

export class CVValFileHandler {
    /**
     * 통합 데이터 저장 (.cvval)
     * [Header Size (4B)][Header JSON][Video Blob][Analysis Blobs...]
     */
    static async toBlob(cvValData: CVValData): Promise<Blob> {
        const imageList = cvValData.getImageListManager().getRawImgList(0);
        if (!imageList || imageList.length === 0) throw new Error("No video data to save");

        // 1. 비디오 인코딩
        const videoConverter = new (MediabunnyImageListToVideo as any)();

        for (const img of imageList) {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            canvas.getContext('2d')?.drawImage(img, 0, 0);

            const blob = await new Promise<Blob | null>(res =>
                canvas.toBlob(res, 'image/jpeg', 0.9)
            );

            if (blob) await videoConverter.addImage(0, blob);
        }

        const videoBlob = await videoConverter.export(cvValData.getVideoMetadata(0)?.fps || 30);

        if (!videoBlob) {
            throw new Error("Video encoding failed: videoBlob is undefined.");
        }

        videoConverter.postprocess();

        // 2. 분석 데이터 및 메타데이터 준비
        const analyses: { type: string; size: number }[] = [];
        const analysisBlobs: Blob[] = [];

        for (const [type, data] of cvValData.getDataStore().getEntries()) {
            const blob = await data.toBlob(true) as unknown as Blob; // 데이터만 포함
            analyses.push({ type, size: blob.size });
            analysisBlobs.push(blob);
        }

        const header = {
            version: "1.0",
            videoMetadata: cvValData.getAllVideoMetadata(),
            videoSize: videoBlob.size,
            analyses: analyses
        };

        const headerBlob = new Blob([JSON.stringify(header)], { type: 'application/json' });
        const headerSize = new ArrayBuffer(4);
        new DataView(headerSize).setUint32(0, headerBlob.size, false);

        return new Blob([headerSize, headerBlob, videoBlob, ...analysisBlobs], { type: 'application/cvval' });
    }

    /**
     * 통합 데이터 로드 (.cvval)
     */
    static async loadFromFile(
        file: File,
        featureRegistry: Record<string, any>,
        loadVideoFn: (files: FileList | Blob[], cvval: CVValData) => Promise<any>,
        cvValData: CVValData // Pass the instance to populate
    ) {
        const buffer = await file.arrayBuffer();
        const view = new DataView(buffer);

        // 1. 헤더 읽기
        cvValData.setName(file.name);

        const headerSize = view.getUint32(0, false);
        const headerJson = new TextDecoder().decode(buffer.slice(4, 4 + headerSize));
        const header = JSON.parse(headerJson);

        // 2. 비디오 복원
        const videoStart = 4 + headerSize;
        const videoBlob = new Blob([buffer.slice(videoStart, videoStart + header.videoSize)], { type: 'video/mp4' });

        // Processor의 loadVideo를 통해 이미지 리스트 복원
        await loadVideoFn([videoBlob] as any, cvValData);
        cvValData.setAllVideoMetadata(header.videoMetadata);

        // 3. 분석 데이터 복원
        let currentPos = videoStart + header.videoSize;
        cvValData.getDataStore().clear();

        for (const info of header.analyses) {
            const analysisBuffer = buffer.slice(currentPos, currentPos + info.size);
            const analysisBlob = new Blob([analysisBuffer]);
            const config = featureRegistry[info.type];

            if (config) {
                const featureData: IAnalysisData = new config.DataClass();
                const dummyFile = new File([analysisBlob], `data.${info.type}`);
                await (featureData as any).loadFromFile(dummyFile);

                cvValData.getDataStore().set(info.type, featureData);
                cvValData.getAnalysisToolManager().addTools(info.type, config.tools || []);
            }
            currentPos += info.size;
        }
    }
}