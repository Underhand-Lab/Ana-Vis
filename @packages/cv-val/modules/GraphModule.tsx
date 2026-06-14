import React, { useMemo, useEffect } from 'react';

import Graph from '@shared/components/Graph';
import { Div, InputColor, InputNumber, InputCheckbox, Select, Toggle } from '@shared/bridges/UIBridge';
import { useTranslation } from 'react-i18next';
import { AnalysisViewProps, AnalysisSettingsProps, AnalysisModule }
    from '@packages/cv-val/types/analysis-module';
import { CVValData } from '../data/cvval-data';

// Graph.tsx와 동일한 색상 생성 로직 (범례 일치를 위함)
const getDeterministicColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const r = (hash & 0xFF0000) >> 16;
    const g = (hash & 0x00FF00) >> 8;
    const b = hash & 0x0000FF;
    return `rgba(${Math.abs(r % 255)}, ${Math.abs(g % 255)}, ${Math.abs(b % 255)}, 1)`;
};

interface LegendItemProps {
    label: string;
    color: string;
    isVisible: boolean;
    onToggleVisibility: () => void;
    onColorChange: (newColor: string) => void;
}

const LegendItem: React.FC<LegendItemProps> = ({
    label,
    color,
    isVisible,
    onToggleVisibility,
    onColorChange
}) => {
    return (
        <Div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <InputCheckbox
                checked={isVisible}
                onChange={onToggleVisibility}
            />
            <InputColor
                value={color}
                onChange={onColorChange}
            />
            <span
                style={{ textDecoration: isVisible ? 'none' : 'line-through', flex: 1 }}
            >
                {label}
            </span>
        </Div>
    );
};

interface GraphSettingsData {
    selectedToolKey: string;
    lineWidth: number;
    datasetVisibility?: Record<string, boolean>;
    showTitle: boolean;
    [key: string]: any;
}

/**
 * 모듈의 기본 설정값
 */
const defaultSettings: GraphSettingsData = {
    selectedToolKey: "",
    lineWidth: 2, // 그래프 선 굵기 추가
    datasetVisibility: {}, // 각 데이터셋의 가시성 상태를 저장
    showTitle: true,
};

/**
 * 출력(View) 컴포넌트: 그래프 캔버스 렌더링 및 데이터 시각화를 담당합니다.
 */
export const GraphView: React.FC<AnalysisViewProps<GraphSettingsData>> = ({
    data,
    currentFrame,
    settings
}) => {
    const { t } = useTranslation();
    // 분석 도구 데이터 추출 로직
    const graphData = useMemo<Record<string, (number | null)[]>>(() => {
        if (!data) return {};

        const tools = data.getAnalysisTools();
        const toolKeys = Object.keys(tools);
        if (toolKeys.length === 0) return {};

        const toolKey = (settings.selectedToolKey && tools[settings.selectedToolKey]) ? settings.selectedToolKey : toolKeys[0];
        const tool = tools[toolKey];

        const result = tool?.getResults();
        return (result || {}) as Record<string, (number | null)[]>;
    }, [data, settings.selectedToolKey]);

    // 기본 설정과 현재 설정을 병합하여 Graph에 전달 (기본 색상 보장)
    const mergedSettings = useMemo(() => ({
        ...defaultSettings,
        ...settings
    }), [settings]);

    const displayTitle = useMemo(() => {
        if (!data) return "";
        const tools = data.getAnalysisTools();
        const toolKeys = Object.keys(tools);
        if (toolKeys.length === 0) return "";
        const toolKey = (settings.selectedToolKey && tools[settings.selectedToolKey]) ? settings.selectedToolKey : toolKeys[0];
        return t(`analysisTools.${toolKey}`, toolKey);
    }, [data, settings.selectedToolKey, t]);

    return (
        <Div className="viewer_container" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
            {settings.showTitle && (
                <Div style={{ padding: '10px 15px 5px 15px', fontSize: '18px', fontWeight: 'bold' }}>
                    {displayTitle ? displayTitle : "..."}
                </Div>
            )}
            <Div style={{ flex: 1, minHeight: 0 }}>
                <Graph
                    data={graphData}
                    idx={currentFrame}
                    settings={mergedSettings}
                />
            </Div>
        </Div>
    );
};

/**
 * 설정(Settings) 컴포넌트: 분석 도구 선택 및 범례 UI를 담당합니다.
 */
export const GraphSettings: React.FC<AnalysisSettingsProps<GraphSettingsData>> = ({ settings, onSettingsChange, data }) => {
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
            label: t(`analysisTools.${tool.name}`, (tool as any).title || tool.name) as string,
            value: tool.name
        }));
    }, [data, t]);

    // 초기 선택값이 없거나 설정된 도구가 현재 데이터에 없는 경우 첫 번째 도구를 자동으로 선택합니다.
    useEffect(() => {
        if (toolOptions.length > 0 && (!settings.selectedToolKey || !toolOptions.find(o => o.value === settings.selectedToolKey))) {
            onSettingsChange({ ...settings, selectedToolKey: toolOptions[0].value });
        }
    }, [toolOptions, settings.selectedToolKey, onSettingsChange, settings]);

    // 차트 인스턴스에 의존하지 않고 데이터로부터 직접 범례 라벨을 추출합니다. (초기 렌더링 보장)
    const labels = useMemo(() => {
        if (!data) return [];

        const tools = data.getAnalysisTools();
        const toolKeys = Object.keys(tools);
        if (toolKeys.length === 0) return [];

        const toolKey = (settings.selectedToolKey && tools[settings.selectedToolKey]) ? settings.selectedToolKey : toolKeys[0];
        const tool = tools[toolKey];
        const results = tool?.getResults();

        return results ? Object.keys(results) : [];
    }, [data, settings.selectedToolKey]);

    const handleShowTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onSettingsChange({ ...settings, showTitle: e.target.checked });
    };

    return (
        <Div className="flex-view" style={{ flexDirection: 'column', gap: '15px' }}>
            {/* 도구 선택 영역 */}
            <InputCheckbox label={t('settings.showTitle')} checked={settings.showTitle} onChange={handleShowTitleChange} />
            <Div style={{ display: 'flex', justifyContent: 'center', flexDirection: 'row', gap: '5px', alignItems: 'center', }}>

                <label>
                    {t('settings.analysisTool')}
                </label>
                <Select
                    value={settings.selectedToolKey}
                    onChange={handleToolChange}
                    options={toolOptions}
                />
            </Div>

            {/* 그래프 범례 및 색상 선택 영역 (React로 직접 렌더링) */}
            {labels.length > 0 && (
                <>
                    <Div style={{ display: 'flex', justifyContent: 'center', flexDirection: 'row', gap: '5px', alignItems: 'center', }}>
                        <label>{t('settings.lineWidth')}</label>
                        <InputNumber
                            min="1"
                            value={settings.lineWidth || 2}
                            onChange={(e) => {
                                const value = parseFloat((e.target as HTMLInputElement).value);
                                let newLineWidth: number = settings.lineWidth;
                                if (!isNaN(value) && value > 0) {
                                    newLineWidth = value;
                                } else if (e.target.value === '') {
                                    newLineWidth = 1;
                                }
                                onSettingsChange({ ...settings, lineWidth: newLineWidth });
                            }}
                            style={{ maxWidth: '70px', }}
                        />
                    </Div>
                    <Toggle title={t('settings.graphLegend')}>
                        <Div
                            className="custom-legend-container flex-view"
                            style={{ textAlign: 'left' }}
                        >
                            {labels.map((label) => {
                                const isVisible = settings.datasetVisibility?.[label] !== false;

                                return (
                                    <LegendItem
                                        key={label}
                                        label={t(`analysisLabels.${label}`, label) as string}
                                        color={settings[label] || defaultSettings[label] || getDeterministicColor(label)}
                                        isVisible={isVisible}
                                        onToggleVisibility={() => {
                                            onSettingsChange({
                                                ...settings,
                                                datasetVisibility: {
                                                    ...settings.datasetVisibility,
                                                    [label]: !isVisible
                                                }
                                            });
                                        }}
                                        onColorChange={(newColor) => {
                                            onSettingsChange({
                                                ...settings,
                                                [label]: newColor
                                            });
                                        }}
                                    />
                                );
                            })}
                        </Div>
                    </Toggle>
                </>
            )}
        </Div>
    );
};

export const GraphModule: AnalysisModule<GraphSettingsData> = {
    type: 'common-graph',
    title: 'common-graph', // Use ID as title for translation key lookup
    View: GraphView,
    Settings: GraphSettings,
    defaultSettings,
    locales: {
        en: {
            analysisTools: { "common-graph": "Analysis Graph" },
            common: { noToolsAvailable: "No tools", noDataToDisplay: "No data" },
            settings: {
                graphLegend: "Graph Legend",
                lineWidth: "Line Width",
                showTitle: "Show Title"
            }
        },
        ko: {
            analysisTools: { "common-graph": "분석 그래프" },
            common: { noToolsAvailable: "도구 x", noDataToDisplay: "데이터 x" },
            settings: {
                graphLegend: "그래프 범례",
                lineWidth: "선 굵기"
            }
        }
    },
    init: (context) => {
        console.log(`[GraphModule] Initialized with tool: ${context.settings.selectedToolKey}`);
    },
    cleanup: () => {
        console.log(`[GraphModule] Resources cleaned up`);
    }
};

export default GraphModule;