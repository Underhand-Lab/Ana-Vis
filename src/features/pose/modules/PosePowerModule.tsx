import React, { useMemo } from 'react';
import Graph from '../../../common/components/Graph';
import { Div, InputNumber, InputColor, InputCheckbox } from '../../../common/bridges/UIBridge';
import { AnalysisViewProps, AnalysisSettingsProps, AnalysisModule } from '../../../common/types/analysis';
import { PoseData } from '../../../lib/cv-val/pose/pose-data';
import { grfTool } from '../../../lib/cv-val/pose/analysis-tool/grf-tool';

interface PosePowerSettingsData {
    userWeight: number;
    lineWidth: number;
    datasetVisibility: Record<string, boolean>;
    [key: string]: any; // 동적 컬러 키 허용 (Vertical GRF 등)
}

const defaultSettings: PosePowerSettingsData = {
    userWeight: 70, // 기본 체중 70kg
    lineWidth: 2,
    datasetVisibility: {
        "Vertical GRF (N)": true,
    },
    "Vertical GRF (N)": "rgba(255, 165, 0, 1)", // 주황색
};

/**
 * 출력(View) 컴포넌트
 */
export const PosePowerView: React.FC<AnalysisViewProps<PoseData, PosePowerSettingsData>> = ({ data, currentFrame, settings }) => {
    const graphData = useMemo<Record<string, (number | null)[]>>(() => {
        if (!data) return {};
        // grfTool을 직접 호출하여 데이터를 가져옵니다.
        const result = grfTool.calc(data, settings);
        return (result ?? {}) as Record<string, (number | null)[]>;
    }, [data, settings]);

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
 * 설정(Settings) 컴포넌트
 */
export const PosePowerSettings: React.FC<AnalysisSettingsProps<PoseData, PosePowerSettingsData>> = ({ settings, onSettingsChange, data }) => {
    const labels = useMemo(() => {
        if (!data) return ["Vertical GRF (N)"];
        const result = grfTool.calc(data, settings);
        return Object.keys(result);
    }, [data, settings.userWeight]);

    return (
        <Div className="flex-view" style={{ flexDirection: 'column', gap: '15px' }}>
            <Div>
                <label style={{ marginRight: '10px' }}>
                    <strong>사용자 체중 (kg)</strong>:
                </label>
                <InputNumber
                    min="1"
                    value={settings.userWeight}
                    onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        let newWeight = settings.userWeight;
                        if (!isNaN(value) && value > 0) {
                            newWeight = value;
                        } else if (e.target.value === '') {
                            newWeight = 1;
                        }
                        onSettingsChange({ ...settings, userWeight: newWeight });
                    }}
                    style={{ maxWidth: '70px', padding: '4px', borderRadius: '4px', border: '1px solid #d1d9e6' }}
                />
            </Div>
            <Div>
                <h4 style={{ fontSize: '14px', marginBottom: '10px' }}>그래프 범례</h4>
                <Div className="custom-legend-container flex-view" style={{ textAlign: 'left' }}>
                    {labels.map((label) => {
                        const isVisible = settings.datasetVisibility?.[label] !== false;
                        return (
                            <Div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
                                <InputCheckbox
                                    checked={isVisible}
                                    onChange={() => {
                                        const newVisibility = { ... (settings.datasetVisibility || {}) };
                                        newVisibility[label] = !isVisible;
                                        onSettingsChange({ ...settings, datasetVisibility: newVisibility });
                                    }}
                                />
                                <InputColor
                                    value={settings[label] || "rgba(150,150,150,1)"}
                                    onChange={(newColor) => {
                                        onSettingsChange({ ...settings, [label]: newColor });
                                    }}
                                />
                                <span style={{ fontSize: '12px', textDecoration: isVisible ? 'none' : 'line-through', flex: 1 }}>
                                    {label}
                                </span>
                            </Div>
                        );
                    })}
                </Div>
            </Div>
        </Div>
    );
};

export const PosePowerModule: AnalysisModule<PoseData, PosePowerSettingsData> = {
    id: 'pose-power',
    title: '자세 파워 (지면반력)',
    View: PosePowerView,
    Settings: PosePowerSettings,
    defaultSettings
};

export default PosePowerModule;