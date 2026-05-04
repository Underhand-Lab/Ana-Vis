import React, { useMemo } from 'react';
import Graph from '../../../common/components/Graph';
import { Div, InputColor, InputNumber, InputCheckbox } from '../../../common/bridges/UIBridge';
import { AnalysisViewProps, AnalysisSettingsProps, AnalysisModule } from '../../../common/types/analysis';
import { PoseData } from '../../../lib/cv-val/pose/pose-data';

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
        <Div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
            <InputCheckbox
                checked={isVisible}
                onChange={onToggleVisibility}
            /> 
            <InputColor
                value={color}
                onChange={onColorChange}
            />
            <span
                style={{ fontSize: '12px', textDecoration: isVisible ? 'none' : 'line-through', flex: 1 }}
            >
                {label}
            </span>
        </Div>
    );
};

interface PoseGraphSettingsData {
    selectedToolKey: string;
    lineWidth: number;
    datasetVisibility: Record<string, boolean>;
    [key: string]: any; // 동적 컬러 키 허용 (L_ARM 등)
}

/**
 * 모듈의 기본 설정값
 */
const defaultSettings: PoseGraphSettingsData = {
    selectedToolKey: "angle",
    // 데이터셋 라벨에 직접 대응하도록 키 변경
    L_ARM: "rgba(255, 0, 0, 1)",
    R_ARM: "rgba(0, 255, 0, 1)",
    L_LEG: "rgba(0, 0, 255, 1)",
    R_LEG: "rgba(255, 255, 0, 1)",
    BODY: "rgba(255, 0, 255, 1)",
    HEAD: "rgba(0, 255, 255, 1)",
    lineWidth: 2, // 그래프 선 굵기 추가
    datasetVisibility: {} // 각 데이터셋의 가시성 상태를 저장
};

/**
 * 출력(View) 컴포넌트: 그래프 캔버스 렌더링 및 데이터 시각화를 담당합니다.
 */
export const PoseGraphView: React.FC<AnalysisViewProps<PoseData, PoseGraphSettingsData>> = ({ 
    data, 
    currentFrame, 
    settings 
}) => {
    // 분석 도구 데이터 추출 로직
    const graphData = useMemo<Record<string, (number | null)[]>>(() => {
        if (!data || !data.analysisTools) return {};
        const tool = data.analysisTools[settings.selectedToolKey];
        const result = tool ? tool.calc(data) : {};
        return (result ?? {}) as Record<string, (number | null)[]>;
    }, [data, settings.selectedToolKey]);

    return (
        <Div className="viewer_container" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Div style={{ flex: 1, minHeight: 0 }}>
                <Graph 
                    data={graphData} 
                    idx={currentFrame} 
                    settings={settings} 
                />
            </Div>
        </Div>
    );
};

/**
 * 설정(Settings) 컴포넌트: 분석 도구 선택 및 범례 UI를 담당합니다.
 */
export const PoseGraphSettings: React.FC<AnalysisSettingsProps<PoseData, PoseGraphSettingsData>> = ({ settings, onSettingsChange, data }) => {
    const handleToolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onSettingsChange({ ...settings, selectedToolKey: e.target.value });
    };

    // 차트 인스턴스에 의존하지 않고 데이터로부터 직접 범례 라벨을 추출합니다. (초기 렌더링 보장)
    const labels = useMemo(() => {
        if (!data) return [];
        const analysisTools = data.analysisTools;
        const tool = analysisTools?.[settings.selectedToolKey];
        const graphData = tool ? (tool.calc(data) || {}) : {};
        return Object.keys(graphData);
    }, [data, settings.selectedToolKey]);

    return (
        <Div className="flex-view" style={{ flexDirection: 'column', gap: '15px' }}>
            {/* 도구 선택 영역 */}
            <Div>
                <label style={{ marginRight: '10px' }}>
                    <strong>도구</strong>:
                </label>
                <select
                    value={settings.selectedToolKey}
                    onChange={handleToolChange}
                    style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #d1d9e6' }}
                >
                    <option value="angle">관절 각도</option>
                    <option value="velocity">관절 이동 속도</option>
                    <option value="angle-velocity">관절 회전 속도</option>
                    <option value="height">관절 높이</option>
                </select>
            </Div>

            {/* 선 굵기 설정 추가 */}
            <Div style={{ display: 'flex', flexDirection: 'row', gap: '5px', alignItems: 'center' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>선 굵기</label>
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
                    style={{ maxWidth: '70px', padding: '4px', borderRadius: '4px', border: '1px solid #d1d9e6' }}
                />
            </Div>

            {/* 그래프 범례 및 색상 선택 영역 (React로 직접 렌더링) */}
            <Div>
                <h4 style={{ fontSize: '14px', marginBottom: '10px' }}>그래프 범례</h4>
                <Div
                    className="custom-legend-container flex-view"
                    style={{ textAlign: 'left' }}
                >
                    {labels.map((label) => {
                        const isVisible = settings.datasetVisibility?.[label] !== false;

                        return (
                            <LegendItem
                                key={label}
                                label={label}
                                color={settings[label] || "rgba(150,150,150,1)"}
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
            </Div>
        </Div>
    );
};

export const PoseGraphModule: AnalysisModule<PoseData, PoseGraphSettingsData> = {
    id: 'pose-graph',
    title: '자세 그래프',
    View: PoseGraphView,
    Settings: PoseGraphSettings,
    defaultSettings
};

export default PoseGraphModule;