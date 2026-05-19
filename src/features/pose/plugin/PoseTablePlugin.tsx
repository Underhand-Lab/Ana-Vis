import React from 'react';
import { TableModulePlugin } from '@/common/modules/TableModule';
import { AnalysisSettingsProps } from '@common/types/analysis-module';
import { Div, InputCheckbox } from '@common/bridges/UIBridge';
import featureName from '../ constant';
import { PoseData } from '../core/pose-data';

export interface PoseTableSettings {
    visibility?: Record<string, boolean>;
}

export class PoseTablePlugin extends TableModulePlugin<any, PoseTableSettings> {
    id = 'pose-table-plugin';
    title = '자세 분석 데이터';
    defaultSettings: PoseTableSettings = {
        visibility: {}
    };

    usePluginContext() {
        return null;
    }

    getRowData(data: any, frameIdx: number, settings: PoseTableSettings) {
        const poseResult = data?.getAnalysisResult?.(featureName, frameIdx);
        if (!poseResult) return null;

        const ret: Record<string, string | number> = {};
        Object.keys(poseResult).forEach(key => {
            if (settings.visibility?.[key] === false) return;
            const val = poseResult[key];
            ret[key] = typeof val === 'number' ? val.toFixed(2) : val;
        });
        return ret;
    }

    getSettingComponent({ settings, onSettingsChange, data }: AnalysisSettingsProps<PoseTableSettings>) {
        
        const poseData =  data?.get(featureName) as PoseData;
        const sampleData = poseData.getAnalysisResult?.(featureName, 0) || {};
        const keys = Object.keys(sampleData);

        return (
            <Div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {keys.map(key => (
                    <InputCheckbox
                        key={key}
                        label={key}
                        checked={settings.visibility?.[key] !== false}
                        onChange={(e) => onSettingsChange({
                            ...settings,
                            visibility: { ...settings.visibility, [key]: e.target.checked }
                        })}
                    />
                ))}
            </Div>
        );
    }
}