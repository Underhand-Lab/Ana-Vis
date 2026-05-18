import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { PoseData } from '../core/pose-data.ts';
import { usePoseVisualize, PoseSettings } from "../hooks/usePoseVisualize.ts";

import { exportVideo } from "@common/utils/exportVideo";
import CanvasRenderer, { CanvasRendererHandle } from "@common/components/ui/react-web/custom/CanvasRenderer.tsx";
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
    const rendererRef = useRef<CanvasRendererHandle>(null);

    // usePoseVisualize 훅이 렌더러 인스턴스를 필요로 하므로, 
    // 컴포넌트 내부에서 명령형 메서드를 제공하는 안정적인 객체를 생성합니다.
    const rendererInterface = useMemo(() => ({
        getCanvas: () => rendererRef.current?.getCanvas() || null
    }), []);

    const { setOptions, getPoseLayer } = usePoseVisualize(data);

    // 설정 반영 후 그리기를 강제하기 위한 로컬 상태
    const [drawTick, setDrawTick] = useState(0);

    // 1. 설정값 동기화: 설정이 변경되면 setOptions를 호출하고 drawTick을 올려 다음 렌더링을 유도합니다.
    // setTimeout(0)을 통해 hook 내부의 상태가 완전히 업데이트된 후(다음 tick) 그리기가 발생하도록 하여
    // "직전의 수정이 반영되는" 현상을 해결합니다.
    useEffect(() => {
        if (settings) {
            setOptions(settings);
            const timerId = setTimeout(() => setDrawTick(t => t + 1), 0);
            return () => clearTimeout(timerId); // eslint-disable-line react-hooks/exhaustive-deps
        }
    }, [settings, setOptions]);

    const drawImageAt = useCallback((frameIdx: number) => {
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

        // 레이어 그리기 (훅 내부에서 showPose, showGRF 옵션에 따라 스켈레톤과 화살표를 모두 포함한 캔버스를 반환함)
        if (poseLayer) ctx.drawImage(poseLayer, 0, 0);

        return compositeCanvas;
    }, [data, getPoseLayer, settings.showBackground, settings.showPose, settings.showGRF, settings.grfScale]);

    // 2. 실제 그리기: data, frame 또는 drawTick(설정 변경 완료)이 바뀔 때 수행합니다.
    useEffect(() => {
        if (!data || !rendererRef.current) return;

        const composite = drawImageAt(currentFrame);
        if (composite) {
            rendererRef.current.updateLayout(composite.width, composite.height);
            rendererRef.current.drawImage(composite);
        }
    }, [data, currentFrame, drawTick, drawImageAt]);

    return (
        <Div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <CanvasRenderer 
                ref={rendererRef} 
                style={{ position: 'absolute', top: 0, left: 0 }} 
            />
        </Div>
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