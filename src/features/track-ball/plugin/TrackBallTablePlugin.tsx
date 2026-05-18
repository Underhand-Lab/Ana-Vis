import React, { useMemo } from 'react';
import { TableModulePlugin } from '@common/module/table/TableModule.tsx';
import { TrackBallData } from '../core/track-ball-data';
import { AnalysisSettingsProps } from '@common/types/analysis-module';
import { Div, InputCheckbox, Select } from '@common/bridges/UIBridge';

export interface TrackBallTableSettingsData {
    selectedToolKey: string;
    visibility?: Record<string, boolean>;
}

export class TrackBallTablePlugin extends TableModulePlugin<TrackBallData, TrackBallTableSettingsData> {
    id = 'track-ball-table-plugin';
    title = '추적 데이터';
    defaultSettings: TrackBallTableSettingsData = {
        selectedToolKey: "default",
        visibility: {}
    };

    usePluginContext() {
        return null;
    }

    getRowData(data: TrackBallData, frameIdx: number, settings: TrackBallTableSettingsData) {
        const processedData = data.getAnalysisResult(settings.selectedToolKey, frameIdx);
        if (!processedData) return null;

        const ret: Record<string, string | number> = {};
        for (const key of Object.keys(processedData)) {
            if (settings.visibility && settings.visibility[key] === false) continue;

            const val = processedData[key];
            if (val !== undefined && val !== null) {
                ret[key] = typeof val === 'number' ? val.toFixed(2) : val;
            }
        }
        return Object.keys(ret).length > 0 ? ret : null;
    }

    getSettingComponent({ settings, onSettingsChange, data }: AnalysisSettingsProps<TrackBallData, TrackBallTableSettingsData>) {
        const toolOptions = [
            { label: "기본 추적 데이터", value: "default" },
            ...(data?.analysisTools ? Object.keys(data.analysisTools).map(key => ({ 
                label: key, 
                value: key
            })) : [])
        ];

        const sampleData = data?.getAnalysisResult(settings.selectedToolKey, 0);
        const availableKeys = sampleData ? Object.keys(sampleData) : [];

        return (
            <>
                <Div>
                    <label style={{ marginRight: '10px' }}><strong>도구</strong>:</label>
                    <Select
                        value={settings.selectedToolKey}
                        onChange={(e) => onSettingsChange({ ...settings, selectedToolKey: e.target.value })}
                        options={toolOptions}
                    />
                </Div>
                <Div>
                    <h4 style={{ fontSize: '13px', marginBottom: '8px' }}>표시할 데이터 선택</h4>
                    <Div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {availableKeys.map((key) => (
                            <InputCheckbox
                                key={key}
                                label={key}
                                checked={settings.visibility?.[key] !== false}
                                onChange={(e) => {
                                    const newVisibility = { ... (settings.visibility || {}) };
                                    newVisibility[key] = e.target.checked;
                                    onSettingsChange({ ...settings, visibility: newVisibility });
                                }}
                            />
                        ))}
                    </Div>
                </Div>
            </>
        );
    }
}