import { AnalysisType, IAnalysisData } from './cvval-types';

export class CVValDataStore {
    // 1차 분석 결과 저장소 (임의의 문자열 키를 지원하기 위해 Map 사용)
    private dataStore = new Map<AnalysisType, IAnalysisData>();

    /**
     * 데이터를 저장합니다.
     */
    set(key: AnalysisType, data: IAnalysisData): void {
        this.dataStore.set(key, data);
    }

    clear(): void {
        this.dataStore.clear();
    }

    /**
     * 특정 분석 타입에 대한 데이터 존재 여부를 확인합니다.
     */
    exist(key: AnalysisType): boolean {
        return this.dataStore.has(key);
    }

    /**
     * 저장된 1차 분석 데이터를 가져옵니다.
     */
    get(key: AnalysisType): IAnalysisData | null {
        return this.dataStore.get(key) || null;
    }

    getEntries(): IterableIterator<[AnalysisType, IAnalysisData]> {
        return this.dataStore.entries();
    }
}