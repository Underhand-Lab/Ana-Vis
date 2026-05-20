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

    locales = {
        en: {
            analysisTools: { "pose-video": "Pose" },
            settings: {
                showJoints: "Show Joints",
                lineWidth: "Line Width",
                jointShape: "Joint Shape",
                jointRadius: "Joint Size",
                jointStrokeWidth: "Joint Border",
                colorSettings: "Color Settings",
                jointShapeCircle: "Circle",
                jointShapeRect: "Rectangle"
            },
            analysisLabels: {
                L_ARM: "Left Arm",
                R_ARM: "Right Arm",
                L_LEG: "Left Leg",
                R_LEG: "Right Leg",
                BODY: "Torso",
                HEAD: "Head",
                JOINT_FILL: "Joint Fill",
                JOINT_STROKE: "Joint Stroke"
            }
        },
        ko: {
            analysisTools: { "pose-video": "자세" },
            settings: {
                showJoints: "관절 표시 여부",
                lineWidth: "선 굵기",
                jointShape: "관절 모양",
                jointRadius: "관절 크기",
                jointStrokeWidth: "관절 테두리",
                colorSettings: "색상 설정",
                jointShapeCircle: "원형",
                jointShapeRect: "사각형"
            },
            analysisLabels: {
                L_ARM: "왼쪽 팔", R_ARM: "오른쪽 팔", L_LEG: "왼쪽 다리", R_LEG: "오른쪽 다리",
                BODY: "몸통", HEAD: "머리", JOINT_FILL: "관절 채우기", JOINT_STROKE: "관절 테두리"
            }
        }
    };

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