import React, { useEffect, useRef } from 'react';

import { usePose3DFrame } from "../hooks/usePose3DFrame"

import { Div, InputColor } from '@shared/bridges/UIBridge';

import { AnalysisViewProps, AnalysisSettingsProps, AnalysisModule }
    from '@packages/cv-val/types/analysis-module';

/**
 * 모듈 설정 및 기본값
 */
const colorMap: Record<string, string> = {
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

export interface Pose3DVideoSettingsData {
    COLOR_LEFT_ARM: string;
    COLOR_RIGHT_ARM: string;
    COLOR_LEFT_LEG: string;
    COLOR_RIGHT_LEG: string;
    COLOR_TORSO: string;
    COLOR_HEAD_NECK: string;
    COLOR_JOINT: string;
    JOINT_STROKE: string;
    backgroundColor: string;
    showBackground: boolean;
    [key: string]: any;
}

const defaultSettings: Pose3DVideoSettingsData = {
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
export const Pose3DVideoView: React.FC<AnalysisViewProps<Pose3DVideoSettingsData>> = ({ data, currentFrame, settings }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const { setOptions, drawPose } = usePose3DFrame(data, canvasRef);

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
        <Div style={{ flex: 1, width: '100%', height: '100%', minHeight: 0, position: 'relative', overflow: 'hidden' }}>
            <canvas
                ref={canvasRef}
                style={{
                    display: 'block',
                    width: '100%',
                    height: '100%',
                    background: 'black',
                    position: 'absolute',
                    top: 0,
                    left: 0
                }}
            />
        </Div>
    );
};

/**
 * 설정(Settings) 컴포넌트
 */
export const Pose3DVideoSettings: React.FC<AnalysisSettingsProps<Pose3DVideoSettingsData>> = ({ settings, onSettingsChange, data }) => {
    return (
        <Div className="flex-view" style={{ flexDirection: 'column', gap: '15px' }}>

            <Div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {Object.entries(colorMap).map(([key, label]) => (
                    <InputColor
                        key={key}
                        label={label}
                        value={settings[key] || (defaultSettings as any)[key]}
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
export const Pose3DVideoModule: AnalysisModule<Pose3DVideoSettingsData> = {
    type: 'pose-3d-video',
    title: '3D 자세 동영상',
    View: Pose3DVideoView,
    Settings: Pose3DVideoSettings,
    defaultSettings,
    init: (context) => {
        console.log(`[Pose3DVideoModule] Initialized`);
    },
    cleanup: () => {
        console.log(`[Pose3DVideoModule] WebGL or 3D Resources cleaned up`);
    }
};

export default Pose3DVideoModule;
