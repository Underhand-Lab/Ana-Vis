import React, { useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import TableRenderer from '@shared/components/ui-brick/react-web/common/TableRenderer';
import { Div, InputCheckbox, Select, Toggle } from '@shared/bridges/UIBridge';

import { AnalysisViewProps, AnalysisSettingsProps, AnalysisModule }
    from '../types/analysis-module';
import { CVValData } from '../data/cvval-data';

interface TableSettingsData {
    selectedToolKey: string;
    visibility?: Record<string, boolean>;
    showTitle?: boolean; // 제목 표시 여부 옵션 추가
}

/**
 * 모듈의 기본 설정값
 */
const defaultSettings: TableSettingsData = {
    selectedToolKey: "",
    visibility: {},
    showTitle: true, // 기본적으로 제목 표시
};

/**
 * 출력(View) 컴포넌트: 데이터 테이블을 렌더링합니다.
 */
export const TableView: React.FC<AnalysisViewProps<TableSettingsData>> = ({ data, currentFrame, settings }) => {
    const { t } = useTranslation();

    // 데이터 계산 및 현재 프레임 값 추출 로직
    const currentFrameData = useMemo(() => {
        if (!data) return null;

        const tools = data.getAnalysisTools();
        const toolKeys = Object.keys(tools);
        if (toolKeys.length === 0) return null;

        // 선택된 키가 없거나 존재하지 않는 도구인 경우 첫 번째 도구를 사용합니다.
        const toolKey = (settings.selectedToolKey && tools[settings.selectedToolKey]) ? settings.selectedToolKey : toolKeys[0];

        const processedData = tools[toolKey].getResult(currentFrame);
        if (!processedData) return null;

        const ret: Record<string, string | number> = {};
        for (const key of Object.keys(processedData)) {
            // 설정에서 해당 키의 가시성이 false인 경우 건너뜀
            if (settings.visibility && settings.visibility[key] === false) continue;
            const val = processedData[key];

            // 키 번역 적용 (매핑된 값이 없으면 원본 키 표시)
            const label = t(`analysisLabels.${key}`, key);
            ret[label] = (val !== null && val !== undefined)
                ? (typeof val === 'number' ? val.toFixed(2) : val)
                : "?";
        }
        return Object.keys(ret).length > 0 ? ret : null;
    }, [data, settings, currentFrame, t]);

    const displayTitle = useMemo(() => {
        if (!data) return "";
        const tools = data.getAnalysisTools();
        const toolKeys = Object.keys(tools);
        if (toolKeys.length === 0) return "";
        const toolKey = (settings.selectedToolKey && tools[settings.selectedToolKey]) ? settings.selectedToolKey : toolKeys[0];
        return t(`analysisTools.${toolKey}`, toolKey);
    }, [data, settings.selectedToolKey, t]);


    return (
        <Div className="viewer_container" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            {settings.showTitle && (
                <Div style={{ padding: '10px 15px 5px 15px', fontSize: '18px', fontWeight: 'bold' }}>
                    {displayTitle ? displayTitle : "..."}
                </Div>
            )}
            <Div className="table-content-area" style={{ flex: 1, overflowY: 'auto', padding: '15px' }}><TableRenderer data={currentFrameData} /></Div>
        </Div>
    );
};

/**
 * 설정(Settings) 컴포넌트: 분석 도구 선택 UI를 담당합니다.
 */
export const TableSettings: React.FC<AnalysisSettingsProps<TableSettingsData>> = ({ settings, onSettingsChange, data }) => {
    const { t } = useTranslation();

    const handleToolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onSettingsChange({ ...settings, selectedToolKey: e.target.value });
    };

    const toolOptions = useMemo(() => {
        if (!data) return [];
        const tools = (data as CVValData)?.getAnalysisTools();
        // If no tools are available, return an option indicating that.
        if (Object.keys(tools).length === 0) {
            return [{ label: t('common.noToolsAvailable'), value: "" }];
        }
        return Object.values(tools).map(tool => ({
            label: t(`analysisTools.${tool.name}`, tool.name) as string,
            value: tool.name
        }));
    }, [data, t]);

    // 초기 선택값이 없거나 설정된 도구가 현재 데이터에 없는 경우 첫 번째 도구를 자동으로 선택합니다.
    useEffect(() => {
        if (toolOptions.length > 0 && (!settings.selectedToolKey || !toolOptions.find(o => o.value === settings.selectedToolKey))) {
            onSettingsChange({ ...settings, selectedToolKey: toolOptions[0].value });
        }
    }, [toolOptions, settings.selectedToolKey, onSettingsChange, settings]);

    // 현재 도구가 출력하는 실제 데이터 키들을 추출합니다.
    const availableKeys = useMemo(() => {
        if (!data) return [];

        const tools = data.getAnalysisTools();
        const toolKeys = Object.keys(tools);
        if (toolKeys.length === 0) return [];

        const toolKey = (settings.selectedToolKey && tools[settings.selectedToolKey]) ? settings.selectedToolKey : toolKeys[0];
        const selectedTool = tools[toolKey];
        const calculatedData = selectedTool.getResult(0);
        return calculatedData ? Object.keys(calculatedData) : [];

    }, [data, settings.selectedToolKey]);

    const handleShowTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onSettingsChange({ ...settings, showTitle: e.target.checked });
    };

    return (
        <Div className="flex-view" style={{ flexDirection: 'column', gap: '15px' }}>
            {/* 제목 표시 여부 옵션 */}
            <InputCheckbox label={t('settings.showTitle')} checked={settings.showTitle} onChange={handleShowTitleChange} />

            <Div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', gap: '10px', alignItems: 'center' }}>
                <label>
                    {t('settings.analysisTool')}
                </label>

                <Select
                    value={settings.selectedToolKey}
                    onChange={handleToolChange}
                    options={toolOptions}
                />
            </Div>

            {/* 행 선택(가시성) 설정 영역 */}
            {availableKeys.length > 0 && (
                <Toggle title={t('settings.selectData')}>
                    <Div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {availableKeys.map((key) => {
                            const isVisible = settings.visibility?.[key] !== false;
                            return (
                                <InputCheckbox
                                    key={key}
                                    label={t(`analysisLabels.${key}`, key)}
                                    checked={isVisible}
                                    onChange={() => {
                                        const newVisibility = { ... (settings.visibility || {}) };
                                        newVisibility[key] = !isVisible;
                                        onSettingsChange({ ...settings, visibility: newVisibility });
                                    }}
                                />
                            );
                        })}
                    </Div>
                </Toggle>
            )}
        </Div>
    );
};

export const TableModule: AnalysisModule<TableSettingsData> = {
    id: 'common-table',
    title: 'common-table', // Use ID as title for translation key lookup
    View: TableView,
    Settings: TableSettings,
    defaultSettings,
    locales: {
        en: {
            analysisTools: { "common-table": "Analysis Table" },
            common: { noToolsAvailable: "No tools", noDataToDisplay: "No data" },
            settings: { selectData: "Data to Display", showTitle: "Show Title" }
        },
        ko: {
            analysisTools: { "common-table": "분석 표" },
            common: { noToolsAvailable: "분석 도구 x", noDataToDisplay: "분석 데이터 x" },
            settings: { selectData: "표시할 정보", showTitle: "제목 표시" }
        }
    },
    init: (context) => {
        console.log(`[TableModule] Initialized with id: ${context.settings.selectedToolKey}`);
    },
    cleanup: () => {
        console.log(`[TableModule] Resources cleaned up`);
    }
};

export default TableModule;