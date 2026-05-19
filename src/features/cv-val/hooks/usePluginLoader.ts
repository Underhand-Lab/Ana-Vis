import React, { ChangeEvent } from 'react';
import { AnalysisModule } from '../types/analysis-module';

/**
 * 외부 JS 파일로부터 AnalysisModule 플러그인을 동적으로 로드하는 훅입니다.
 * @param analysisTools 플러그인에 주입할 분석 도구들 (객체 또는 배열)
 * @param onLoad 플러그인이 성공적으로 로드되었을 때 호출될 콜백 함수
 */
export const usePluginLoader = (
    analysisTools: any,
    onLoad: (module: AnalysisModule<any>) => void
) => {
    return (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target?.result as string;
                // eslint-disable-next-line no-new-func
                const plugin = new Function('React', 'AnalysisTools', `return ${content}`)(React, analysisTools);

                if (plugin && plugin.View && plugin.title) {
                    onLoad({ ...plugin, id: `plugin-${Date.now()}` });
                } else {
                    throw new Error("Invalid module format");
                }
            } catch (err) {
                console.error("Plugin loading failed:", err);
                alert("플러그인 로드 실패: 올바른 AnalysisModule 형식이 아니거나 호환되지 않는 파일입니다.");
            }
        };
        reader.readAsText(file);
        e.target.value = "";
    };
};