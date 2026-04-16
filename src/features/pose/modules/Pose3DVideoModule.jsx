import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { usePose3DVisualize } from "../hooks/usePose3DVisualize.jsx"
import { RgbaColorPicker } from "react-colorful";

/**
 * RGBA 문자열 파싱 및 변환 헬퍼
 */
const parseRgba = (rgbaStr) => {
    if (!rgbaStr || typeof rgbaStr !== 'string') return { r: 255, g: 255, b: 255, a: 1 };

    if (rgbaStr.startsWith('#')) {
        const r = parseInt(rgbaStr.slice(1, 3), 16);
        const g = parseInt(rgbaStr.slice(3, 5), 16);
        const b = parseInt(rgbaStr.slice(5, 7), 16);
        return { r, g, b, a: 1 };
    }

    const match = rgbaStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!match) return { r: 255, g: 255, b: 255, a: 1 };

    return {
        r: parseInt(match[1], 10),
        g: parseInt(match[2], 10),
        b: parseInt(match[3], 10),
        a: match[4] ? parseFloat(match[4]) : 1
    };
};

const ColorPickerItem = ({ label, value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [localColor, setLocalColor] = useState(value);

    useEffect(() => {
        setLocalColor(value);
    }, [value]);

    const handleColorChange = (color) => {
        const newRgba = `rgba(${color.r},${color.g},${color.b},${color.a})`;
        setLocalColor(newRgba);
        onChange(newRgba);
    };

    return (
        <div style={{ position: 'relative', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                    onClick={() => setIsOpen(!isOpen)}
                    style={{
                        width: '30px', height: '30px', borderRadius: '4px', border: '2px solid white',
                        boxShadow: '0 0 0 1px #ddd', background: localColor, cursor: 'pointer'
                    }}
                />
                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{label}</span>
            </div>
            {isOpen && (
                <div style={{ position: 'absolute', zIndex: 100, top: '35px', left: 0 }}>
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }} onClick={() => setIsOpen(false)} />
                    <RgbaColorPicker color={parseRgba(localColor)} onChange={handleColorChange} />
                </div>
            )}
        </div>
    );
};

/**
 * 모듈 설정 및 기본값
 */
const colorMap = {
    COLOR_LEFT_ARM: "L_ARM",
    COLOR_RIGHT_ARM: "R_ARM",
    COLOR_LEFT_LEG: "L_LEG",
    COLOR_RIGHT_LEG: "R_LEG",
    COLOR_TORSO: "BODY",
    COLOR_HEAD_NECK: "HEAD",
    COLOR_JOINT: "JOINT FILL",
    JOINT_STROKE: "JOINT STROKE",
    backgroundColor: "배경 색상"
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
    backgroundColor: "rgba(0,0,0,1)",
    showBackground: true,
};

/**
 * 출력(View) 컴포넌트
 */
export const Pose3DVideoView = ({ data, currentFrame, settings }) => {
    const canvasRef = useRef(null);
    const { setOptions, drawPose } = usePose3DVisualize(data, canvasRef);

    // 설정값 동기화
    useEffect(() => {
        if (settings) {
            setOptions(settings);
        }
    }, [settings, setOptions]);

    // 실제 그리기
    useEffect(() => {
        if (data) {
            drawPose(currentFrame);
        }
    }, [data, currentFrame, drawPose]);

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <canvas ref={canvasRef} style={{ width: '100%', height: '100%', background: 'black', position: 'absolute', top: 0, left: 0 }} />
        </div>
    );
};

/**
 * 설정(Settings) 컴포넌트
 */
export const Pose3DVideoSettings = ({ settings, onSettingsChange, data }) => {
    return (
        <div className="flex-view" style={{ flexDirection: 'column', gap: '15px' }}>

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

/**
 * 최종 모듈 객체
 */
export const Pose3DVideoModule = {
    id: 'pose-3d-video',
    title: '3D 자세 동영상',
    View: Pose3DVideoView,
    Settings: Pose3DVideoSettings,
    defaultSettings
};

export default Pose3DVideoModule;