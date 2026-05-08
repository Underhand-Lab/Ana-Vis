import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { PoseData } from '../core/pose-data.ts';
import { usePoseVisualize } from "../hooks/usePoseVisualize";

import { exportVideo } from "@common/utils/exportVideo";
import CanvasRenderer, { CanvasRendererHandle } from "@common/components/ui/react-web/custom/CanvasRenderer.tsx";
import { Div, Button, InputNumber, InputColor, InputCheckbox, Select }
    from '@common/bridges/UIBridge.ts';
import { AnalysisViewProps, AnalysisSettingsProps, AnalysisModule }
    from '@common/types/analysis-module.ts';

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

export interface PoseSettings {
    COLOR_LEFT_ARM: string;
    COLOR_RIGHT_ARM: string;
    COLOR_LEFT_LEG: string;
    COLOR_RIGHT_LEG: string;
    COLOR_TORSO: string;
    COLOR_HEAD_NECK: string;
    COLOR_JOINT: string;
    JOINT_STROKE: string;
    lineWidth: number;
    showBackground: boolean;
    jointShape: string;
    jointRadius: number;
    jointStrokeWidth: number;
    [key: string]: any; // dynamic color keys
}

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

        if (poseLayer) ctx.drawImage(poseLayer, 0, 0);
        return compositeCanvas;
    }, [data, getPoseLayer, settings.showBackground]);

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
                style={{ fontWeight: 'bold' }}
            />
            {/* 선 굵기 설정 추가 */}
            <Div style={{ display: 'flex', flexDirection: 'row', gap: '5px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', alignContent: 'center' }}>선 굵기</label> {/* Display current value */}
                <InputNumber
                    min="1"
                    // 'max'와 'step' 속성은 무제한 양수 입력을 위해 제거
                    value={settings.lineWidth || 2}
                    onChange={(e) => {
                        const value = parseFloat(e.target.value); // parseFloat을 사용하여 소수점도 허용
                        let newLineWidth = settings.lineWidth; // 현재 값 유지
                        if (!isNaN(value) && value > 0) { // 유효한 양수일 경우에만 업데이트
                            newLineWidth = value;
                        } else if (e.target.value === '') { // 입력 필드가 비어있을 경우 기본값 1로 설정
                            newLineWidth = 1;
                        }
                        onSettingsChange({ ...settings, lineWidth: newLineWidth });
                    }}
                    style={{ maxWidth: '70px', cursor: 'pointer' }}
                />
            </Div>
            {/* 관절 모양 설정 추가 */}
            <Div style={{ display: 'flex', flexDirection: 'row', gap: '5px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', alignContent: 'center' }}>관절 모양</label>
                <Select
                    value={settings.jointShape || 'circle'}
                    onChange={(e) => onSettingsChange({ ...settings, jointShape: e.target.value })}
                    style={{ padding: '2px 5px', borderRadius: '4px', border: '1px solid #ccc' }}
                    options={jointShapeOptions}
                />
            </Div>
            {/* 관절 크기 설정 추가 */}
            <Div style={{ display: 'flex', flexDirection: 'row', gap: '5px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', alignContent: 'center' }}>관절 크기</label>
                <InputNumber
                    min="0"
                    value={settings.jointRadius !== undefined ? settings.jointRadius : 4}
                    onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        let newValue = settings.jointRadius;
                        if (!isNaN(value) && value >= 0) {
                            newValue = value;
                        } else if (e.target.value === '') {
                            newValue = 0;
                        }
                        onSettingsChange({ ...settings, jointRadius: newValue });
                    }}
                    style={{ maxWidth: '70px', cursor: 'pointer' }}
                />
            </Div>
            {/* 관절 테두리 설정 추가 */}
            <Div style={{ display: 'flex', flexDirection: 'row', gap: '5px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', alignContent: 'center' }}>관절 테두리</label>
                <InputNumber
                    min="0"
                    value={settings.jointStrokeWidth !== undefined ? settings.jointStrokeWidth : 2}
                    onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        let newValue = settings.jointStrokeWidth;
                        if (!isNaN(value) && value >= 0) {
                            newValue = value;
                        } else if (e.target.value === '') {
                            newValue = 0;
                        }
                        onSettingsChange({ ...settings, jointStrokeWidth: newValue });
                    }}
                    style={{ maxWidth: '70px', cursor: 'pointer' }}
                />
            </Div>
            <Div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {Object.entries(colorMap).map(([key, label]) => ( // eslint-disable-line react-hooks/exhaustive-deps
                    <InputColor
                        key={key}
                        label={label}
                        value={settings[key] || defaultSettings[key]}
                        onChange={(newColor) => onSettingsChange({ ...settings, [key]: newColor })}
                    />
                ))}
            </Div>
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