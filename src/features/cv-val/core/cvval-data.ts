import { VideoMetadata }
    from "@/common/service/video-to-img-list/media-bunny";
import { MediabunnyImageListToVideo }
    from "@/common/service/image-list-to-video/media-bunny";
import i18n from './i18n';

// 모듈별 로케일 정보가 이미 i18n에 등록되었는지 추적하기 위한 집합
const registeredLocales = new WeakSet<object>();
/**
 * 분석 타입을 문자열로 정의하여 확장성을 확보합니다.
 * 기본적으로 AnalysisDataMap의 키들을 포함하지만, 임의의 문자열도 허용합니다.
 */
export type AnalysisType = string;

export interface IAnalysisData {
    toBlob(dataOnly?: boolean): Promise<Blob>;
    getRawImgList?(idx: number): ImageBitmap[];
    clearRawImgList?(): void; // 메모리 해제를 위한 메서드 추가
}

/**
 * 2차 분석 플러그인 인터페이스
 */
export interface IAnalysisTool {
    name: string;
    setData(data: CVValData): void;
    getResult(idx: number): Record<string, (number | null)> | null;
    getResults(): Record<string, (number | null)[]> | null;
    locales?: Record<string, any>;
}

export class CVValData {
    // 1차 분석 결과 저장소 (임의의 문자열 키를 지원하기 위해 Map 사용)
    private dataStore = new Map<string, IAnalysisData>();
    private videoMetaDataList: VideoMetadata[] = [];
    private rawImgListList: ImageBitmap[][] = [];

    // 2차 분석 플러그인 저장소
    private tools = new Map<string, IAnalysisTool[]>();

    setRawImgList(imgList: ImageBitmap[], _index: number) {
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
     */
    set(key: string, data: any): void {
        this.dataStore.set(key, data);

        // 레거시 호환성: 개별 데이터 객체(PoseData 등)가 이미지 리스트를 직접 들고 있는 경우,
        // CVValData의 중앙 이미지 저장소가 비어있다면 해당 리스트를 복사해옵니다.
        if (this.rawImgListList.length === 0 && typeof data.getRawImgList === 'function') {
            const imgList = data.getRawImgList(0);
            if (imgList && imgList.length > 0) {
                this.setRawImgList(imgList, 0);
            }
        }

        // 소유권 이전: CVValData에 이미 이미지가 있다면(혹은 방금 옮겼다면) 
        // 메모리 절약을 위해 개별 데이터 객체 내의 이미지 리스트는 항상 비워줍니다.
        if (this.rawImgListList.length > 0 && typeof data.clearRawImgList === 'function') {
            data.clearRawImgList();
        }

        const typeTools = this.tools.get(key);
        if (typeTools) {
            typeTools.forEach(tool => tool.setData(this));
        }
    }
    
    clearDataStore() { this.dataStore.clear(); }

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

        // 플러그인에 정의된 로케일 정보를 i18n에 동적으로 등록
        if (plugin.locales && !registeredLocales.has(plugin.locales)) {
            Object.entries(plugin.locales).forEach(([lng, resources]) => {
                i18n.addResourceBundle(lng, 'translation', resources as any, true, true);
            });
            registeredLocales.add(plugin.locales);
        }

        plugin.setData(this);
    }

    addAnalysisTools(key: string, plugins: IAnalysisTool[]) {
        const existing = this.tools.get(key) || [];
        this.tools.set(key, [...existing, ...plugins]);

        plugins.forEach(plugin => {
            // 플러그인에 정의된 로케일 정보를 i18n에 동적으로 등록
            if (plugin.locales && !registeredLocales.has(plugin.locales)) {
                Object.entries(plugin.locales).forEach(([lng, resources]) => {
                    i18n.addResourceBundle(lng, 'translation', resources as any, true, true);
                });
                registeredLocales.add(plugin.locales);
            }
            plugin.setData(this);
        });

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

    /**
     * 통합 데이터 저장 (.cvval)
     * [Header Size (4B)][Header JSON][Video Blob][Analysis Blobs...]
     */
    async toBlob(): Promise<Blob> {
        const imageList = this.getRawImgList(0);
        if (!imageList) throw new Error("No video data to save");

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

        const videoBlob = await videoConverter.export(this.getVideoMetadata(0)?.fps || 30);

        if (!videoBlob) {
            throw new Error("Video encoding failed: videoBlob is undefined.");
        }

        videoConverter.postprocess();

        // 2. 분석 데이터 및 메타데이터 준비
        const analyses: { type: string; size: number }[] = [];
        const analysisBlobs: Blob[] = [];

        for (const [type, data] of this.dataStore) {
            const blob = await data.toBlob(true) as unknown as Blob; // 데이터만 포함
            analyses.push({ type, size: blob.size });
            analysisBlobs.push(blob);
        }

        const header = {
            version: "1.0",
            videoMetadata: this.videoMetaDataList,
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
    async loadFromFile(
        file: File, 
        featureRegistry: Record<string, any>, 
        loadVideoFn: (files: FileList | Blob[], cvval: CVValData) => Promise<any>
    ) {
        const buffer = await file.arrayBuffer();
        const view = new DataView(buffer);
        
        // 1. 헤더 읽기
        const headerSize = view.getUint32(0, false);
        const headerJson = new TextDecoder().decode(buffer.slice(4, 4 + headerSize));
        const header = JSON.parse(headerJson);

        // 2. 비디오 복원
        const videoStart = 4 + headerSize;
        const videoBlob = new Blob([buffer.slice(videoStart, videoStart + header.videoSize)], { type: 'video/mp4' });
        
        // Processor의 loadVideo를 통해 이미지 리스트 복원
        await loadVideoFn([videoBlob] as any, this);
        this.setVideoMetadata(header.videoMetadata);

        // 3. 분석 데이터 복원
        let currentPos = videoStart + header.videoSize;
        this.clearDataStore();

        for (const info of header.analyses) {
            const analysisBuffer = buffer.slice(currentPos, currentPos + info.size);
            const analysisBlob = new Blob([analysisBuffer]);
            const config = featureRegistry[info.type];

            if (config) {
                const featureData = new config.DataClass();
                // File 객체로 래핑하여 기존 loadFromFile 호환 유지
                const dummyFile = new File([analysisBlob], `data.${info.type}`);
                await featureData.loadFromFile(dummyFile);
                this.set(info.type, featureData);
                
                if (config.tools) {
                    this.addAnalysisTools(info.type, config.tools);
                }
            }
            currentPos += info.size;
        }
    }
}