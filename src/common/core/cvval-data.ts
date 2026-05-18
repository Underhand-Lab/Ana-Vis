/**
 * 분석 타입을 문자열로 정의하여 확장성을 확보합니다.
 * 기본적으로 AnalysisDataMap의 키들을 포함하지만, 임의의 문자열도 허용합니다.
 */
export type AnalysisType = string;

/**
 * 2차 분석 플러그인 인터페이스
 */
export interface IAnalysisPlugin<T = any> {
    name: string;
    setData(data: T): void;
    getResult(): any;
}

export class CVValData {
    // 1차 분석 결과 저장소 (임의의 문자열 키를 지원하기 위해 Map 사용)
    private dataStore = new Map<string, any>();

    // 2차 분석 플러그인 저장소
    private plugins = new Map<string, IAnalysisPlugin<any>[]>();

    /**
     * 데이터를 저장하고 등록된 플러그인을 자동으로 실행합니다.
     * AnalysisDataMap에 정의된 키일 경우 해당 데이터 타입을 강제하고,
     * 정의되지 않은 키('runner' 등)일 경우 any 타입을 허용합니다.
     */
    set<K extends string>(
        key: K,
        data: any
    ): void {
        this.dataStore.set(key, data);
        
        const typePlugins = this.plugins.get(key);
        if (typePlugins) {
            typePlugins.forEach(plugin => plugin.setData(data));
        }
    }

    /**
     * 저장된 1차 분석 데이터를 가져옵니다.
     */
    get<K extends string>(key: K): any {
        return this.dataStore.get(key);
    }

    /**
     * 특정 분석 타입에 대한 데이터 존재 여부를 확인합니다.
     */
    exist(key: string): boolean {
        return this.dataStore.has(key);
    }

    /**
     * 2차 분석 알고리즘(플러그인)을 추가합니다.
     */
    addPlugin<K extends string>(
        key: K,
        plugin: IAnalysisPlugin<any>
    ): void {
        const existing = this.plugins.get(key) || [];
        this.plugins.set(key, [...existing, plugin]);

        // 이미 데이터가 존재하는 경우, 추가된 플러그인에 데이터 전달
        const currentData = this.dataStore.get(key);
        if (currentData) {
            plugin.setData(currentData);
        }
    }
    
    getAnalysisResults(type: string): Record<string, any> {
        const results: Record<string, any> = {};
        const typePlugins = this.plugins.get(type) || [];
        typePlugins.forEach((plugin) => {
            results[plugin.name] = plugin.getResult();
        });

        return results;
    }
}