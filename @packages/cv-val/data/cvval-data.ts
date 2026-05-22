import { VideoMetadata }
    from "@shared/service/video-to-img-list/media-bunny";
import { AnalysisType, IAnalysisData, IAnalysisTool } from './cvval-types';
import { CVValImageListManager } from './cvval-image-list-manager';
import { CVValDataStore } from './cvval-data-store';
import { CVValAnalysisToolManager } from './cvval-analysis-tool-manager';
import { CVValFileHandler } from './cvval-file-handler';

export class CVValData {
    private name: string = "";
    private videoMetaDataList: VideoMetadata[] = [];

    private imageListManager: CVValImageListManager;
    private dataStoreManager: CVValDataStore;
    private analysisToolManager: CVValAnalysisToolManager;

    constructor() {
        this.imageListManager = new CVValImageListManager();
        this.dataStoreManager = new CVValDataStore();
        this.analysisToolManager = new CVValAnalysisToolManager(this);
    }

    // Getters for internal managers (used by CVValFileHandler and potentially other internal logic)
    getImageListManager(): CVValImageListManager { return this.imageListManager; }
    getDataStore(): CVValDataStore { return this.dataStoreManager; }
    getAnalysisToolManager(): CVValAnalysisToolManager { return this.analysisToolManager; }

    setName(name: string) { 
        this.name = name.replace(/\.[^/.]+$/, ""); 
    }
    getName(): string { return this.name; }

    // Delegates to ImageListManager
    setRawImgList(imgList: ImageBitmap[], _index: number) {
        this.imageListManager.setRawImgList(imgList, _index);
    }

    getRawImgList(idx: number): ImageBitmap[] {
        return this.imageListManager.getRawImgList(idx);
    }

    getFrameCnt(): number {
        return this.imageListManager.getFrameCnt();
    }

    setVideoMetadata(videoMetaDataList: VideoMetadata[]) {
        this.videoMetaDataList = videoMetaDataList;
    }

    getVideoMetadata(idx: number): VideoMetadata {
        return this.videoMetaDataList[idx];
    }
    
    getAllVideoMetadata(): VideoMetadata[] {
        return this.videoMetaDataList;
    }

    setAllVideoMetadata(metadata: VideoMetadata[]) {
        this.videoMetaDataList = metadata;
    }

    /**
     * 데이터를 저장하고 등록된 플러그인을 자동으로 실행합니다.
     */
    set(key: AnalysisType, data: IAnalysisData): void {
        this.dataStoreManager.set(key, data);

        this.imageListManager.copyRawImgListFromData(data);
        this.imageListManager.clearRawImgListForData(data);
        this.analysisToolManager.runToolsForType(key);
    }
    
    clearDataStore() { this.dataStoreManager.clear(); }

    /**
     * 특정 분석 타입에 대한 데이터 존재 여부를 확인합니다.
     */
    exist(key: AnalysisType): boolean {
        return this.dataStoreManager.exist(key);
    }

    /**
     * 저장된 1차 분석 데이터를 가져옵니다.
     */
    get(key: AnalysisType): IAnalysisData | null {
        return this.dataStoreManager.get(key);
    }

    /**
     * 2차 분석 알고리즘(플러그인)을 추가합니다.
     */
    addAnalysisTool(key: AnalysisType, plugin: IAnalysisTool): void {
        this.analysisToolManager.addTool(key, plugin);
    }

    addAnalysisTools(key: AnalysisType, plugins: IAnalysisTool[]) {
        this.analysisToolManager.addTools(key, plugins);
    }

    getAnalysisTool(type: AnalysisType, name: string) : IAnalysisTool | undefined {
        return this.analysisToolManager.getTool(type, name);
    }

    getAnalysisTools() : Record<string, IAnalysisTool> {
        return this.analysisToolManager.getAllTools();
    }

    /**
     * 통합 데이터 저장 (.cvval)
     * [Header Size (4B)][Header JSON][Video Blob][Analysis Blobs...]
     */
    async toBlob(): Promise<Blob> {
        return CVValFileHandler.toBlob(this);
    }

    /**
     * 통합 데이터 로드 (.cvval)
     */
    async loadFromFile(
        file: File, 
        featureRegistry: Record<string, any>, 
        loadVideoFn: (files: FileList | Blob[], cvval: CVValData) => Promise<any>
    ) {
        await CVValFileHandler.loadFromFile(file, featureRegistry, loadVideoFn, this);
    }
}