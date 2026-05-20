import React, { useEffect } from 'react';
import { PoseData } from '../core/pose-data.ts';
import { usePoseFrame, SkeletonSettings } from "../hooks/usePoseFrame";

import { Div, InputNumber, InputColor, InputCheckbox, Select }
    from '@common/bridges/UIBridge.ts';
import { AnalysisSettingsProps } from '@features/cv-val/types/analysis-module.ts';
import { useTranslation } from 'react-i18next';
import { VideoModulePlugin } from '@/features/cv-val/modules/VideoModule.tsx';
import { Toggle } from '@/common/components/ui-brick/react-web/common/Toggle.tsx';
import { CVValData } from '@/features/cv-val/core/cvval-data.ts';

const colorMap = {
    COLOR_LEFT_ARM: "L_ARM",
    COLOR_RIGHT_ARM: "R_ARM",
    COLOR_LEFT_LEG: "L_LEG",
    COLOR_RIGHT_LEG: "R_LEG",
    COLOR_TORSO: "BODY",
    COLOR_HEAD_NECK: "HEAD",
    COLOR_JOINT: "JOINT_FILL",
    JOINT_STROKE: "JOINT_STROKE"
};

const defaultSettings: SkeletonSettings = {
    COLOR_LEFT_ARM: "rgba(255,0,0,1)",
    COLOR_RIGHT_ARM: "rgba(0,255,0,1)",
    COLOR_LEFT_LEG: "rgba(0,0,255,1)",
    COLOR_RIGHT_LEG: "rgba(255,255,0,1)",
    COLOR_TORSO: "rgba(255,0,255,1)",
    COLOR_HEAD_NECK: "rgba(0,255,255,1)",
    COLOR_JOINT: "rgba(255,255,255,1)",
    JOINT_STROKE: "rgba(255,255,255,1)",
    lineWidth: 2,
    jointShape: 'circle', // This should be part of SkeletonSettings
    jointRadius: 4,      // This should be part of SkeletonSettings
    jointStrokeWidth: 2, // This should be part of SkeletonSettings
    showPose: true,      // This should be part of SkeletonSettings
};

export class PoseVideoPlugin extends VideoModulePlugin<SkeletonSettings> {
    id = 'pose-video'; // Keep the ID
    title = 'pose-video'; // Use ID as title for translation key lookup
    defaultSettings = defaultSettings; // Update defaultSettings to match SkeletonSettings

    usePluginContext(data: CVValData, settings: SkeletonSettings) {
        const { setOptions, getPoseLayer } = usePoseFrame(data);

        useEffect(() => {
            if (settings) {
                setOptions(settings);
            }
        }, [settings, setOptions]);

        return { getPoseLayer };
    }

    drawOverlay(ctx: CanvasRenderingContext2D, frameIdx: number, _data: any, settings: SkeletonSettings, context: { getPoseLayer: (idx: number) => HTMLCanvasElement | null }) {
        const poseLayer = context.getPoseLayer(frameIdx);
        
        if (poseLayer) {
            ctx.drawImage(poseLayer, 0, 0);
        }
    }

    getSettingComponent({ settings, onSettingsChange }: AnalysisSettingsProps<SkeletonSettings>) {
        const { t } = useTranslation();
        const jointShapeOptions = [
            { label: t('settings.jointShapeCircle'), value: "circle" },
            { label: t('settings.jointShapeRect'), value: "rect" }
        ];

        return (
            <>
                <InputCheckbox
                    label={t('settings.showJoints')}
                    checked={settings.showPose !== false}
                    onChange={(e) => onSettingsChange({ ...settings, showPose: e.target.checked })}
                />
                <Div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', width: '80px' }}>{t('settings.lineWidth')}</label>
                    <InputNumber
                        min="1"
                        value={settings.lineWidth || 2}
                        onChange={(e) => onSettingsChange({ ...settings, lineWidth: parseFloat(e.target.value) || 1 })}
                        style={{ maxWidth: '70px', cursor: 'pointer' }}
                    />
                </Div>
                <Div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', width: '80px' }}>{t('settings.jointShape')}</label>
                    <Select
                        value={settings.jointShape || 'circle'}
                        onChange={(e) => onSettingsChange({ ...settings, jointShape: e.target.value })}
                        options={jointShapeOptions}
                        style={{ cursor: 'pointer', maxWidth: '90px' }}
                    />
                </Div>
                <Div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', width: '80px' }}>{t('settings.jointRadius')}</label>
                    <InputNumber
                        min="0"
                        value={settings.jointRadius !== undefined ? settings.jointRadius : 4}
                        onChange={(e) => onSettingsChange({ ...settings, jointRadius: parseFloat(e.target.value) || 0 })}
                        style={{ maxWidth: '70px', cursor: 'pointer' }}
                    />
                </Div>
                <Div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', width: '80px' }}>{t('settings.jointStrokeWidth')}</label>
                    <InputNumber
                        min="0"
                        value={settings.jointStrokeWidth !== undefined ? settings.jointStrokeWidth : 2}
                        onChange={(e) => onSettingsChange({ ...settings, jointStrokeWidth: parseFloat(e.target.value) || 0 })}
                        style={{ maxWidth: '70px', cursor: 'pointer' }}
                    />
                </Div>
                <Div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>{t('settings.colorSettings')}</label>
                    {Object.entries(colorMap).map(([key, label]) => (
                        <InputColor
                            key={key}
                            label={t(`analysisLabels.${label}`, label)}
                                value={settings[key] || (defaultSettings as any)[key]}
                            onChange={(newColor) => onSettingsChange({ ...settings, [key]: newColor })}
                        />
                    ))}
                </Div>
            </>
        );
    }
}