import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { PoseData } from '../core/pose-data.ts';
import { usePoseVisualize, PoseSettings } from "../hooks/usePoseVisualize.ts";

import { exportVideo } from "@common/utils/exportVideo";
import { VideoModule } from "@common/module/video/VideoModule.tsx";
import { IVideoStrategy } from "@common/types/video-strategy.ts";
import { Div, Button, InputNumber, InputColor, InputCheckbox, Select }
    from '@common/bridges/UIBridge.ts';
import { AnalysisViewProps, AnalysisSettingsProps, AnalysisModule }
    from '@common/types/analysis-module.ts';
import { Toggle } from '@common/components/ui/react-web/common/Toggle.tsx';

/**
 * 모듈에서 사용할 색상 매핑 및 기본 설정값
 */
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

/**
 * 출력(View) 컴포넌트: 실제 캔버스 렌더링을 담당합니다.
 */
export const PoseVideoView: React.FC<AnalysisViewProps<PoseData, PoseSettings>> = ({ data, currentFrame, settings }) => {
    const { setOptions, getPoseLayer } = usePoseVisualize(data);

    useEffect(() => {
        if (settings) setOptions(settings);
    }, [settings, setOptions]);

    // Pose용 렌더링 전략 정의
    const strategies = useMemo<IVideoStrategy[]>(() => [{
        type: 'pose',
        draw: (ctx, _data, frameIdx) => {
            const poseLayer = getPoseLayer(frameIdx);
            if (poseLayer) ctx.drawImage(poseLayer, 0, 0);
        }
    }], [getPoseLayer]);

    // VideoModule 호환성을 위한 데이터 어댑터
    const cvValDataAdapter = useMemo(() => ({
        get: () => data,
        exist: () => !!data
    }), [data]);

    return (
        <VideoModule
            cvValData={cvValDataAdapter as any}
            currentFrame={currentFrame}
            strategies={strategies}
            settings={{
                pose: settings,
                global: { showBackground: settings.showBackground }
            }}
        />
    );
};

/**
 * 설정(Settings) 컴포넌트: 사용자 UI를 통한 설정 변경을 담당합니다.
 */
export const PoseVideoSettings: React.FC<AnalysisSettingsProps<PoseData, PoseSettings>> = ({ settings, onSettingsChange, data }) => {
    const [isExporting, setIsExporting] = useState(false);
    
    // 내보내기용 가상 인터페이스
    const dummyRenderer = useMemo(() => ({ getCanvas: () => null }), []);
    const { setOptions, getPoseLayer } = usePoseVisualize(data);

    const jointShapeOptions = useMemo(() => [
        { label: "원형 (Circle)", value: "circle" },
        { label: "사각형 (Square)", value: "rect" }
    ], []);

    // 설정값(색상 등) 동기화
    useEffect(() => {
        if (settings) setOptions(settings);
    }, [settings, setOptions]);

    const drawImageAt = (frameIdx: number) => {
        if (!data) return null;
        const rawImgList = data.getRawImgList(0);
        const backgroundImage = rawImgList[frameIdx];
        if (!backgroundImage) return null;

        const poseLayer = getPoseLayer(frameIdx);
        const compositeCanvas = document.createElement('canvas');
        compositeCanvas.width = backgroundImage.width;
        compositeCanvas.height = backgroundImage.height;
        const ctx = compositeCanvas.getContext('2d');
        if (!ctx) return null;

        if (settings.showBackground !== false) {
            ctx.drawImage(backgroundImage, 0, 0);
        } else {
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, compositeCanvas.width, compositeCanvas.height);
        }

        // 레이어 그리기 (내보내기용)
        if (poseLayer) ctx.drawImage(poseLayer, 0, 0);

        return compositeCanvas;
    };

    const handleExport = async () => {
        if (!data || isExporting) return;
        setIsExporting(true);
        await exportVideo(drawImageAt, data.getFrameCnt(), {
            fps: data.getFrameCnt(),
            name: `pose_video_${Date.now()}.mp4`
        });
        setIsExporting(false);
    };

    return (
        <Div className="flex-view" style={{ flexDirection: 'column', gap: '15px' }}>


            <Button
                onClick={handleExport}
                disabled={isExporting || !data}
                style={{ margin: 0, padding: '8px 15px', width: '100%', cursor: isExporting || !data ? 'not-allowed' : 'pointer' }}
            >
                {isExporting ? '저장 중...' : '비디오 저장'}
            </Button>

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
                            value={settings[key] || defaultSettings[key]}
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
        </Div>
    );
};

export const PoseVideoModule: AnalysisModule<PoseData, PoseSettings> = {
    id: 'pose-video',
    title: '자세 동영상',
    View: PoseVideoView,
    Settings: PoseVideoSettings,
    defaultSettings
};

export default PoseVideoModule;