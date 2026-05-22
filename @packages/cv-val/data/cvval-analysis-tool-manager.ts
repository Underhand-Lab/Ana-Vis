import i18n from '../../../@shared/utils/i18n';
import { IAnalysisTool, AnalysisType } from './cvval-types';
import { CVValData } from './cvval-data';

// 모듈별 로케일 정보가 이미 i18n에 등록되었는지 추적하기 위한 집합
const registeredLocales = new WeakSet<object>();

export class CVValAnalysisToolManager {
    // 2차 분석 플러그인 저장소
    private tools = new Map<AnalysisType, Map<string, IAnalysisTool>>();
    private cvValData: CVValData; // Reference to the parent CVValData instance

    constructor(cvValData: CVValData) {
        this.cvValData = cvValData;
    }

    /**
     * 2차 분석 알고리즘(플러그인)을 추가합니다.
     */
    addTool(key: AnalysisType, plugin: IAnalysisTool): void {
        const existing = this.tools.get(key) || new Map<string, IAnalysisTool>();
        this.tools.set(key, existing.set(plugin.name, plugin));

        // 플러그인에 정의된 로케일 정보를 i18n에 동적으로 등록
        if (plugin.locales && !registeredLocales.has(plugin.locales)) {
            Object.entries(plugin.locales).forEach(([lng, resources]) => {
                i18n.addResourceBundle(lng, 'translation', resources as any, true, true);
            });
            registeredLocales.add(plugin.locales);
        }

        plugin.setData(this.cvValData);
    }

    addTools(key: AnalysisType, plugins: IAnalysisTool[]) {
        const existing = this.tools.get(key) || new Map<string, IAnalysisTool>();

        plugins.forEach(plugin => {
            this.tools.set(key, existing.set(plugin.name, plugin));

            // 플러그인에 정의된 로케일 정보를 i18n에 동적으로 등록
            if (plugin.locales && !registeredLocales.has(plugin.locales)) {
                Object.entries(plugin.locales).forEach(([lng, resources]) => {
                    i18n.addResourceBundle(lng, 'translation', resources as any, true, true);
                });
                registeredLocales.add(plugin.locales);
            }
            plugin.setData(this.cvValData);
        });
    }

    getTool(type: AnalysisType, name: string): IAnalysisTool | undefined {
        const tools = this.tools.get(type);
        if (!tools) return undefined;
        return tools.get(name);
    }

    getAllTools(): Record<string, IAnalysisTool> {
        const ret: Record<string, IAnalysisTool> = {};
        for (const toolMap of this.tools.values()) {
            for (const tool of toolMap.values()) {
                ret[tool.name] = tool;
            }
        }
        return ret;
    }

    runToolsForType(key: AnalysisType) {
        this.tools.get(key)?.forEach(tool => tool.setData(this.cvValData));
    }
}