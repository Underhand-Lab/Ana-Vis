import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { usePose3DVisualize } from "../hooks/usePose3DVisualize.jsx"
import { Div, InputColor } from '../../../common/components/ui/UI.jsx';

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
        <Div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <canvas ref={canvasRef} style={{ width: '100%', height: '100%', background: 'black', position: 'absolute', top: 0, left: 0 }} />
        </Div>
    );
};

/**
 * 설정(Settings) 컴포넌트
 */
export const Pose3DVideoSettings = ({ settings, onSettingsChange, data }) => {
    return (
        <Div className="flex-view" style={{ flexDirection: 'column', gap: '15px' }}>

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