import { MediaBunnyVideoToImageList, VideoMetadata }
    from "@shared/service/video-to-img-list/media-bunny"
import { MediabunnyImageListToVideo }
    from "@shared/service/image-list-to-video/media-bunny"
import { Landmarks3D, PoseDetectionResult, AnalysisTool,
    JointCoordinate, PoseFrameData } from "../types";
import { IAnalysisData } from "@packages/cv-val/data/cvval-data";

export class PoseData implements IAnalysisData {
    private rawImgListList: ImageBitmap[][] = [];
    private landmarks3dList: (Landmarks3D | null)[] = [];
    private landmarks2dListList: (Landmarks3D | null)[][] = [];
    private visibilityScoreListList: (Record<string, number> | null)[][] = [];
    private frameRate: number = 30; // Add frameRate property
    private videoMetaDataList: VideoMetadata[] = [];
    public analysisTools?: Record<string, AnalysisTool>;
    private _analysisCache: Record<string, any> = {};

    constructor() {
        this.rawImgListList = [];
        this.landmarks3dList = [];
        this.landmarks2dListList = [];
        this.visibilityScoreListList = [];
    }

    initialize(videoMetaDataList: VideoMetadata[]): void {

        this.videoMetaDataList = videoMetaDataList;

        this.rawImgListList = Array.from({ length: videoMetaDataList.length }, () => []);
        this.landmarks2dListList = Array.from({ length: videoMetaDataList.length }, () => []);
        this.visibilityScoreListList = Array.from({ length: videoMetaDataList.length }, () => []);
        if (videoMetaDataList.length > 0) {
            this.frameRate = videoMetaDataList[0]?.fps || 30; // Initialize frameRate
        }
        this.clearAnalysisCache();

    }

    addDataAt(idx: number, rawImg: ImageBitmap, data: PoseDetectionResult): void {
        this.rawImgListList[idx].push(rawImg);
        this.landmarks2dListList[idx].push(data.landmarks2dList[0]);
        this.visibilityScoreListList[idx].push(data.visibilityScoreList[0]);

        this.landmarks3dList.push(data.landmarks3d);
        this.clearAnalysisCache();
    }

    getVideoMetadata(idx: number): VideoMetadata {
        return this.videoMetaDataList[idx];
    }

    getFrameCnt(): number {
        return this.landmarks3dList.length;
    }

    getRawImgList(idx: number): ImageBitmap[] {
        return this.rawImgListList[idx];
    }

    getLandmarks3d(): (Landmarks3D | null)[] {
        return this.landmarks3dList;
    }

    getLandmarks2dList(idx: number): (Landmarks3D | null)[] {
        return this.landmarks2dListList[idx];
    }

    getVisibilityScoreList(idx: number): (Record<string, number> | null)[] {
        return this.visibilityScoreListList[idx];
    }

    getFPS(): number { // Add getFPS method
        return this.frameRate;
    }

    getPose(index: number): PoseFrameData { // Add getPose method
        const landmarks3d = this.landmarks3dList[index];
        const visibilityScores = this.visibilityScoreListList[0]?.[index]; // Assuming visibility scores are per frame for the first video

        const keypoints: Record<string, JointCoordinate | undefined> = {};
        if (landmarks3d) {
            for (const key in landmarks3d) {
                const [x, y, z] = landmarks3d[key];
                keypoints[key] = { x, y, z, score: visibilityScores?.[key] };
            }
        }
        return { keypoints };
    }
    
    /**
     * 분석 도구의 결과를 요청합니다. (Lazy Evaluation)
     * 결과가 캐시에 있으면 즉시 반환하고, 없으면 도구를 실행하여 계산 후 캐싱합니다.
     */
    public getAnalysisResult(toolKey: string, index?: number): any {
        if (!this.analysisTools) return null;

        // 1. 캐시 확인
        if (this._analysisCache[toolKey] === undefined) {
            // 2. 도구 실행 및 결과 저장
            const tool = this.analysisTools[toolKey];
            if (tool && typeof tool.calc === 'function') {
                this._analysisCache[toolKey] = tool.calc(this);
            }
        }

        const result = this._analysisCache[toolKey];
        if (!result) return null;

        // 3. index가 제공된 경우 해당 프레임의 데이터만 추출하여 반환
        if (index !== undefined) {
            const frameData: Record<string, any> = {};
            for (const key of Object.keys(result)) {
                const values = result[key];
                if (Array.isArray(values)) {
                    frameData[key] = values[index];
                } else {
                    frameData[key] = values;
                }
            }
            return frameData;
        }

        return result;
    }

    public clearAnalysisCache(): void {
        this._analysisCache = {};
    }

    clearRawImgList(): void {
        this.rawImgListList = this.rawImgListList.map(() => []);
    }

    async toBlob(dataOnly: boolean = false): Promise<Blob> {
        const videoBlobs: Blob[] = [];
        
        // 1. 비디오 인코딩 (dataOnly가 아닐 때만 수행)
        if (!dataOnly) {
            for (let i = 0; i < this.rawImgListList.length; i++) {
            const imageList = this.getRawImgList(i);
            const metadata = this.getVideoMetadata(i);
            
            if (!imageList || imageList.length === 0) continue;

            const videoConverter = new (MediabunnyImageListToVideo as any)();
            
            for (const img of imageList) {
                // ImageBitmap을 Blob으로 변환하여 추가
                const blob = await this._imageBitmapToBlob(img);
                if (blob) await videoConverter.addImage(i, blob);
            }

            // 인코딩 후 Blob 생성
            const videoBlob: Blob = await videoConverter.export(metadata.fps || 30);
            videoBlobs.push(videoBlob);
            videoConverter.postprocess();
        }
        }

        // 2. 수치 데이터 구조화
        const jsonInfo = JSON.stringify({
            metadata: this.videoMetaDataList,
            landmarks3d: this.landmarks3dList,
            landmarks2d: this.landmarks2dListList,
            visibility: this.visibilityScoreListList
        });

        const jsonBuffer = new TextEncoder().encode(jsonInfo);
        const finalParts: BlobPart[] = [];
        
        // [구조] JSON길이(4) | JSON데이터 | 비디오개수(4) | (비디오길이(4) | 비디오데이터) 반복
        
        // JSON 파트 기록
        const jsonHeader = new ArrayBuffer(4);
        new DataView(jsonHeader).setUint32(0, jsonBuffer.byteLength, true);
        finalParts.push(jsonHeader, jsonBuffer);

        // 비디오 파트 기록
        const videoCountHeader = new ArrayBuffer(4);
        new DataView(videoCountHeader).setUint32(0, videoBlobs.length, true);
        finalParts.push(videoCountHeader);

        for (const vBlob of videoBlobs) {
            const vSizeHeader = new ArrayBuffer(4);
            new DataView(vSizeHeader).setUint32(0, vBlob.size, true);
            finalParts.push(vSizeHeader, vBlob);
        }

        // 3. 브라우저 다운로드 실행
        const combinedBlob = new Blob(finalParts, { type: "application/cvp" });

        return combinedBlob;
    }

    private async _imageBitmapToBlob(bitmap: ImageBitmap): Promise<Blob | null> {
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
        return new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.9));
    }
    
    async loadFromFile(file: File): Promise<void> {
        const arrayBuffer = await file.arrayBuffer();
        let offset = 0;
        const view = new DataView(arrayBuffer);

        // 1. JSON 데이터 읽기
        const jsonSize = view.getUint32(offset, true);
        offset += 4;
        
        const jsonBuffer = arrayBuffer.slice(offset, offset + jsonSize);
        offset += jsonSize;
        
        const jsonText = new TextDecoder().decode(jsonBuffer);
        const parsed = JSON.parse(jsonText);

        // 2. 클래스 기본 속성 복원
        this.videoMetaDataList = parsed.metadata;
        this.landmarks3dList = parsed.landmarks3d;
        this.landmarks2dListList = parsed.landmarks2d;
        this.visibilityScoreListList = parsed.visibility;
        if (this.videoMetaDataList.length > 0) {
            this.frameRate = this.videoMetaDataList[0].fps || 30; // Restore frameRate
        }

        // 3. 비디오 데이터 읽기 및 이미지 리스트 복원
        const videoCount = view.getUint32(offset, true);
        offset += 4;

        this.rawImgListList = [];

        for (let i = 0; i < videoCount; i++) {
            const videoSize = view.getUint32(offset, true);
            offset += 4;

            const videoBlob = new Blob([arrayBuffer.slice(offset, offset + videoSize)], { type: "video/mp4" });
            offset += videoSize;

            // 비디오 Blob을 다시 ImageBitmap 배열로 변환 (역변환)
            const images = await this._videoToImageBitmaps(videoBlob);
            this.rawImgListList.push(images);
        }
    }

    private async _videoToImageBitmaps(videoBlob: Blob): Promise<ImageBitmap[]> {
        const converter = new (MediaBunnyVideoToImageList as any)();
        const file = new File([videoBlob], "temp.mp4", { type: "video/mp4" });
        const { imageList } = await converter.convert(file);
        return imageList;
    }
}