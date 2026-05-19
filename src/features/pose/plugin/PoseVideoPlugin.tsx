import React, { useEffect } from 'react';
import { PoseData } from '../core/pose-data.ts';
import { usePoseVisualize, PoseSettings } from "../hooks/usePoseVisualize";

import { Div, InputNumber, InputColor, InputCheckbox, Select }
    from '@common/bridges/UIBridge.ts';
import { AnalysisSettingsProps } from '@common/types/analysis-module.ts';
import { VideoModulePlugin, VideoModuleBuilder } from '@/common/modules/VideoModule.tsx';
import { Toggle } from '@common/components/ui/react-web/common/Toggle.tsx';
import { CVValData } from '@/common/core/cvval-data.ts';

const colorMap = {
    COLOR_LEFT_ARM: "L_ARM",
    COLOR_RIGHT_ARM: "R_ARM",
    COLOR_LEFT_LEG: "L_LEG",
    COLOR_RIGHT_LEG: "R_LEG",
    COLOR_TORSO: "BODY",
    COLOR_HEAD_NECK: "HEAD",
    COLOR_JOINT: "JOINT FILL",
    JOINT_STROKE: "JOINT STROKE"
};

const defaultSettings: PoseSettings = {
    COLOR_LEFT_ARM: "rgba(255,0,0,1)",
    COLOR_RIGHT_ARM: "rgba(0,255,0,1)",
    COLOR_LEFT_LEG: "rgba(0,0,255,1)",
    COLOR_RIGHT_LEG: "rgba(255,255,0,1)",
    COLOR_TORSO: "rgba(255,0,255,1)",
    COLOR_HEAD_NECK: "rgba(0,255,255,1)",
    COLOR_JOINT: "rgba(255,255,255,1)",
    JOINT_STROKE: "rgba(255,255,255,1)",
    lineWidth: 2,
    showBackground: true,
    jointShape: 'circle',
    jointRadius: 4,
    jointStrokeWidth: 2,
    showPose: true,
    showGRF: false,
    grfScale: 0.1,
};

export class PoseVideoPlugin extends VideoModulePlugin<PoseSettings> {
    id = 'pose-video';
    title = '자세 동영상';
    defaultSettings = defaultSettings;

    usePluginContext(data: CVValData, settings: PoseSettings) {
        const { setOptions, getPoseLayer } = usePoseVisualize(data);

        useEffect(() => {
            if (settings) {
                setOptions(settings);
            }
        }, [settings, setOptions]);

        return { getPoseLayer };
    }

    drawOverlay(ctx: CanvasRenderingContext2D, frameIdx: number, _data: any, settings: PoseSettings, context: { getPoseLayer: (idx: number) => HTMLCanvasElement | null }) {
        const poseLayer = context.getPoseLayer(frameIdx);
        
        if (!settings.showBackground) {
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        }

        if (poseLayer) {
            ctx.drawImage(poseLayer, 0, 0);
        }
    }

    getSettingComponent({ settings, onSettingsChange }: AnalysisSettingsProps<PoseSettings>) {
        const jointShapeOptions = [
            { label: "원형 (Circle)", value: "circle" },
            { label: "사각형 (Square)", value: "rect" }
        ];

        return (
            <>
            <InputCheckbox
                label="배경 이미지 표시"
                checked={settings.showBackground !== false}
                onChange={(e) => onSettingsChange({ ...settings, showBackground: e.target.checked })}
                style={{ fontWeight: 'bold', marginBottom: '10px' }}
            />

            <Toggle title="자세(관절) 시각화 설정">
                <InputCheckbox
                    label="관절 표시 여부"
                    checked={settings.showPose !== false}
                    onChange={(e) => onSettingsChange({ ...settings, showPose: e.target.checked })}
                />
                <Div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', width: '80px' }}>선 굵기</label>
                    <InputNumber
                        min="1"
                        value={settings.lineWidth || 2}
                        onChange={(e) => onSettingsChange({ ...settings, lineWidth: parseFloat(e.target.value) || 1 })}
                        style={{ maxWidth: '70px', cursor: 'pointer' }}
                    />
                </Div>
                <Div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', width: '80px' }}>관절 모양</label>
                    <Select
                        value={settings.jointShape || 'circle'}
                        onChange={(e) => onSettingsChange({ ...settings, jointShape: e.target.value })}
                        options={jointShapeOptions}
                        style={{ cursor: 'pointer', maxWidth: '90px' }}
                    />
                </Div>
                <Div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', width: '80px' }}>관절 크기</label>
                    <InputNumber
                        min="0"
                        value={settings.jointRadius !== undefined ? settings.jointRadius : 4}
                        onChange={(e) => onSettingsChange({ ...settings, jointRadius: parseFloat(e.target.value) || 0 })}
                        style={{ maxWidth: '70px', cursor: 'pointer' }}
                    />
                </Div>
                <Div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', width: '80px' }}>관절 테두리</label>
                    <InputNumber
                        min="0"
                        value={settings.jointStrokeWidth !== undefined ? settings.jointStrokeWidth : 2}
                        onChange={(e) => onSettingsChange({ ...settings, jointStrokeWidth: parseFloat(e.target.value) || 0 })}
                        style={{ maxWidth: '70px', cursor: 'pointer' }}
                    />
                </Div>
                <Div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>색상 설정</label>
                    {Object.entries(colorMap).map(([key, label]) => (
                        <InputColor
                            key={key}
                            label={label}
                                value={settings[key] || (defaultSettings as any)[key]}
                            onChange={(newColor) => onSettingsChange({ ...settings, [key]: newColor })}
                        />
                    ))}
                </Div>
            </Toggle>

            <Toggle title="지면반력(GRF) 시각화 설정">
                <InputCheckbox
                    label="GRF 화살표 표시"
                    checked={settings.showGRF === true}
                    onChange={(e) => onSettingsChange({ ...settings, showGRF: e.target.checked })}
                />
                <Div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', width: '80px' }}>화살표 배율</label>
                    <InputNumber
                        min="0"
                        step="0.01"
                        value={settings.grfScale !== undefined ? settings.grfScale : 0.1}
                        onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            onSettingsChange({ ...settings, grfScale: isNaN(value) ? 0.1 : value });
                        }}
                        style={{ maxWidth: '70px', cursor: 'pointer' }}
                    />
                </Div>
            </Toggle>
            </>
        );
    }
}