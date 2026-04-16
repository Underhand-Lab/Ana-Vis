import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CanvasRenderer } from "../../../lib/cv-val-visualizer/canvas-renderer.js";
import { usePoseVisualize } from "../hooks/usePoseVisualize.jsx";
import { exportVideo } from "../../../common/utils/exportVideo.jsx";
import { RgbaColorPicker } from "react-colorful";

/**
 * RGBA 문자열을 { r, g, b, a } 객체로 변환
 */
const parseRgba = (rgbaStr) => {
    if (!rgbaStr || typeof rgbaStr !== 'string') return { r: 255, g: 255, b: 255, a: 1 };
    const match = rgbaStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!match) return { r: 255, g: 255, b: 255, a: 1 };
    return {
        r: parseInt(match[1], 10),
        g: parseInt(match[2], 10),
        b: parseInt(match[3], 10),
        a: match[4] ? parseFloat(match[4]) : 1
    };
};

/**
 * { r, g, b, a } 객체를 rgba 문자열로 변환
 */
const stringifyRgba = (obj) => `rgba(${obj.r},${obj.g},${obj.b},${obj.a})`;

/**
 * 개별 색상 피커 컴포넌트
 */
const ColorPickerItem = ({ label, value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const pickerRef = useRef(null);

    return (
        <div style={{ position: 'relative', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                    onClick={() => setIsOpen(!isOpen)}
                    style={{
                        width: '36px', height: '36px', borderRadius: '4px', border: '2px solid white',
                        boxShadow: '0 0 0 1px #ddd', background: value, cursor: 'pointer'
                    }}
                />
                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{label}</span>
            </div>
            {isOpen && (
                <div style={{ position: 'absolute', zIndex: 100, top: '40px', left: 0 }}>
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }} onClick={() => setIsOpen(false)} />
                    <RgbaColorPicker color={parseRgba(value)} onChange={(color) => onChange(`rgba(${color.r},${color.g},${color.b},${color.a})`)} />
                </div>
            )}
        </div>
    );
};

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

const defaultSettings = {
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
export const PoseVideoView = ({ data, currentFrame, settings }) => {
    const canvasRef = useRef(null);
    const [isExporting, setIsExporting] = useState(false);
    const renderer = useMemo(() => new CanvasRenderer(), []);
    const { setOptions, getPoseLayer } = usePoseVisualize(data, renderer);

    // 설정 반영 후 그리기를 강제하기 위한 로컬 상태
    const [drawTick, setDrawTick] = useState(0);

    // 1. 설정값 동기화: 설정이 변경되면 setOptions를 호출하고 drawTick을 올려 다음 렌더링을 유도합니다.
    // setTimeout(0)을 통해 hook 내부의 상태가 완전히 업데이트된 후(다음 tick) 그리기가 발생하도록 하여
    // "직전의 수정이 반영되는" 현상을 해결합니다.
    useEffect(() => {
        if (settings) {
            setOptions(settings);
            const timerId = setTimeout(() => setDrawTick(t => t + 1), 0);
            return () => clearTimeout(timerId);
        }
    }, [settings, setOptions]);

    const drawImageAt = (frameIdx) => {
        if (!data) return null;
        const rawImgList = data.getRawImgList(0);
        const backgroundImage = rawImgList[frameIdx];
        if (!backgroundImage) return null;

        const poseLayer = getPoseLayer(frameIdx);
        const compositeCanvas = document.createElement('canvas');
        compositeCanvas.width = backgroundImage.width;
        compositeCanvas.height = backgroundImage.height;
        const ctx = compositeCanvas.getContext('2d');

        if (settings.showBackground !== false) {
            ctx.drawImage(backgroundImage, 0, 0);
        } else {
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, compositeCanvas.width, compositeCanvas.height);
        }

        if (poseLayer) ctx.drawImage(poseLayer, 0, 0);
        return compositeCanvas;
    };

    // 2. 실제 그리기: data, frame 또는 drawTick(설정 변경 완료)이 바뀔 때 수행합니다.
    useEffect(() => {
        if (!data || !canvasRef.current) return;

        renderer.setCanvas(canvasRef.current);
        const composite = drawImageAt(currentFrame);
        if (composite) {
            renderer.updateLayout(composite.width, composite.height);
            renderer.drawImage(composite);
        }
    }, [data, currentFrame, drawTick, renderer]);
    // 의존성에서 settings를 drawTick으로 대체하여 설정 적용 후 그리기가 보장되도록 함

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <canvas ref={canvasRef} style={{ width: '100%', height: '100%', background: 'black', position: 'absolute', top: 0, left: 0 }} />
        </div>
    );
};

/**
 * 설정(Settings) 컴포넌트: 사용자 UI를 통한 설정 변경을 담당합니다.
 */
export const PoseVideoSettings = ({ settings, onSettingsChange, data, currentFrame }) => {
    const [isExporting, setIsExporting] = useState(false);
    // Settings 컴포넌트 내에서 비디오 내보내기를 위한 렌더러 및 포즈 시각화 훅 인스턴스 생성
    // View 컴포넌트와는 별개의 인스턴스이므로, View의 렌더링에 영향을 주지 않습니다.
    const renderer = useMemo(() => new CanvasRenderer(), []);
    const { setOptions, getPoseLayer } = usePoseVisualize(data, renderer);

    // 설정값(색상 등) 동기화
    useEffect(() => {
        if (settings) setOptions(settings);
    }, [settings, setOptions]);

    const drawImageAt = (frameIdx) => {
        if (!data) return null;
        const rawImgList = data.getRawImgList(0);
        const backgroundImage = rawImgList[frameIdx];
        if (!backgroundImage) return null;

        const poseLayer = getPoseLayer(frameIdx);
        const compositeCanvas = document.createElement('canvas');
        compositeCanvas.width = backgroundImage.width;
        compositeCanvas.height = backgroundImage.height;
        const ctx = compositeCanvas.getContext('2d');

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
            fps: data.fps,
            name: `pose_video_${Date.now()}.mp4`
        });
        setIsExporting(false);
    };

    return (
        <div className="flex-view" style={{ flexDirection: 'column', gap: '15px' }}>


            <button
                onClick={handleExport}
                disabled={isExporting || !data}
                style={{ margin: 0, padding: '8px 15px', width: '100%', cursor: isExporting || !data ? 'not-allowed' : 'pointer' }}
            >
                {isExporting ? '저장 중...' : '비디오 저장'}
            </button>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 'bold' }}>
                <input
                    type="checkbox"
                    checked={settings.showBackground !== false}
                    onChange={(e) => onSettingsChange({ ...settings, showBackground: e.target.checked })}
                />
                배경 이미지 표시
            </label>
            {/* 선 굵기 설정 추가 */}
            <div style={{ display: 'flex', flexDirection: 'row', gap: '5px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', alignContent: 'center' }}>선 굵기</label> {/* Display current value */}
                <input
                    type="number" // 'range'에서 'number'로 변경
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
            </div>
            {/* 관절 모양 설정 추가 */}
            <div style={{ display: 'flex', flexDirection: 'row', gap: '5px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', alignContent: 'center' }}>관절 모양</label>
                <select
                    value={settings.jointShape || 'circle'}
                    onChange={(e) => onSettingsChange({ ...settings, jointShape: e.target.value })}
                    style={{ padding: '2px 5px', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                    <option value="circle">원형 (Circle)</option>
                    <option value="rect">사각형 (Square)</option>
                </select>
            </div>
            {/* 관절 크기 설정 추가 */}
            <div style={{ display: 'flex', flexDirection: 'row', gap: '5px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', alignContent: 'center' }}>관절 크기</label>
                <input
                    type="number"
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
            </div>
            {/* 관절 테두리 설정 추가 */}
            <div style={{ display: 'flex', flexDirection: 'row', gap: '5px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', alignContent: 'center' }}>관절 테두리</label>
                <input
                    type="number"
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
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {Object.entries(colorMap).map(([key, label]) => (
                    <ColorPickerItem
                        key={key}
                        label={label}
                        value={settings[key] || defaultSettings[key]}
                        onChange={(newColor) => onSettingsChange({ ...settings, [key]: newColor })}
                    />
                ))}
            </div>
        </div>
    );
};

export const PoseVideoModule = {
    id: 'pose-video',
    title: '자세 동영상',
    View: PoseVideoView,
    Settings: PoseVideoSettings,
    defaultSettings
};

export default PoseVideoModule;