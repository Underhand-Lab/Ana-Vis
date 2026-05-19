import { MediaBunnyVideoToImageList, VideoMetadata }
    from "@/common/service/video-to-img-list/media-bunny";
/**
 * 분석 타입을 문자열로 정의하여 확장성을 확보합니다.
 * 기본적으로 AnalysisDataMap의 키들을 포함하지만, 임의의 문자열도 허용합니다.
 */
export type AnalysisType = string;

export interface IAnalysisData {
    toBlob(): Promise<Blob>;
}

/**
 * 2차 분석 플러그인 인터페이스
 */
export interface IAnalysisTool {
    name: string;
    setData(data: CVValData): void;
    getResult(idx: number): Record<string, (number | null)> | null;
    getResults(): Record<string, (number | null)[]> | null;
}

export class CVValData {
    // 1차 분석 결과 저장소 (임의의 문자열 키를 지원하기 위해 Map 사용)
    private dataStore = new Map<string, IAnalysisData>();
    private videoMetaDataList: VideoMetadata[] = [];
    private rawImgListList: ImageBitmap[][] = [];

    // 2차 분석 플러그인 저장소
    private tools = new Map<string, IAnalysisTool[]>();

    setRawImgList(imgList: ImageBitmap[], index: number) {
        this.rawImgListList.push(imgList);
    }

    getRawImgList(idx: number): ImageBitmap[] {
        return this.rawImgListList[idx];
    }

    getFrameCnt(): number {
        return this.rawImgListList[0]?.length || 0;
    }

    setVideoMetadata(videoMetaDataList: VideoMetadata[]) {
        this.videoMetaDataList = videoMetaDataList;
    }

    getVideoMetadata(idx: number): VideoMetadata {
        return this.videoMetaDataList[idx];
    }

    /**
     * 데이터를 저장하고 등록된 플러그인을 자동으로 실행합니다.
     * AnalysisDataMap에 정의된 키일 경우 해당 데이터 타입을 강제하고,
     * 정의되지 않은 키('runner' 등)일 경우 any 타입을 허용합니다.
     */
    set(key: string, data: any): void {
        
        this.dataStore.set(key, data);

        if (this.rawImgListList.length < 1) {
            this.setRawImgList(data.getRawImgList(0), 0);
        }
         
        const typeTools = this.tools.get(key);
        if (typeTools) {
            typeTools.forEach(tool => tool.setData(this));
        }
    }

    /**
     * 특정 분석 타입에 대한 데이터 존재 여부를 확인합니다.
     */
    exist(key: string): boolean {
        return this.dataStore.has(key);
    }

    /**
     * 저장된 1차 분석 데이터를 가져옵니다.
     */
    get(key: string): IAnalysisData | null {
        const ret = this.dataStore.get(key);
        if (ret) return ret;
        return null;
    }

    /**
     * 2차 분석 알고리즘(플러그인)을 추가합니다.
     */
    addAnalysisTool<K extends string>(
        key: K, plugin: IAnalysisTool
    ): void {
        const existing = this.tools.get(key) || [];
        this.tools.set(key, [...existing, plugin]);

        plugin.setData(this);
    }

    addAnalysisTools(key: string, plugins: IAnalysisTool[]) {
        const existing = this.tools.get(key) || [];
        this.tools.set(key, [...existing, ...plugins]);

        plugins.forEach(plugin => plugin.setData(this));

    }

    getAnalysisTools() : Record<string, IAnalysisTool> {
        const ret: Record<string, IAnalysisTool> = {};

        // Map의 값(IAnalysisTool[] 배열들)을 순회합니다.
        for (const toolArray of this.tools.values()) {
            for (const tool of toolArray) {
                ret[tool.name] = tool; // tool.name이 모든 도구에서 고유하다고 가정합니다.
            }
        }
        return ret;
    }

    async toBlob(): Promise<Blob> {
        const poseData = this.dataStore.get('pose');
        if (!poseData) throw new Error("Pose data not found");
        return poseData.toBlob();
    }
}