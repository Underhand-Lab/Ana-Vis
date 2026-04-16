import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { GraphVisualizer } from "../../../lib/visualizer/graph.js";
import { RgbaColorPicker } from "react-colorful";

const parseRgba = (rgbaStr) => {
    if (!rgbaStr || typeof rgbaStr !== 'string') return { r: 255, g: 255, b: 255, a: 1 };

    // Hex 지원 (#RRGGBB)
    if (rgbaStr.startsWith('#')) {
        const r = parseInt(rgbaStr.slice(1, 3), 16);
        const g = parseInt(rgbaStr.slice(3, 5), 16);
        const b = parseInt(rgbaStr.slice(5, 7), 16);
        return { r, g, b, a: 1 };
    }

    // RGBA 정규식 개선 (공백 유무에 유연하게 대응)
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
    // 로컬 상태를 두어 드래그 시 즉각적인 반응을 보장합니다.
    const [localColor, setLocalColor] = useState(value);

    // 외부에서 들어오는 value가 바뀌면 로컬 상태 동기화
    useEffect(() => {
        if (value && value !== localColor) {
            setLocalColor(value);
        }
    }, [value]);

    const handleColorChange = useCallback((color) => {
        const newRgba = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
        setLocalColor(newRgba);
        onChange(newRgba);
    }, [onChange]);

    return (
        <div style={{ position: 'relative', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                    onClick={() => setIsOpen(!isOpen)}
                    style={{
                        width: '36px', height: '36px', borderRadius: '4px', border: '2px solid white',
                        boxShadow: '0 0 0 1px #ddd', background: localColor, cursor: 'pointer'
                    }}
                />
                {label && <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{label}</span>}
            </div>
            {isOpen && (
                <div style={{ position: 'absolute', zIndex: 100, top: '40px', left: 0 }}>
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }} onClick={() => setIsOpen(false)} />
                    <RgbaColorPicker color={parseRgba(localColor)} onChange={handleColorChange} />
                </div>
            )}
        </div>
    );
};

const LegendItem = ({ label, color, isVisible, onToggleVisibility, onColorChange }) => {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
            <input
                type="checkbox"
                checked={isVisible}
                onChange={onToggleVisibility}
                style={{ cursor: 'pointer' }}
            />
            <ColorPickerItem
                value={color}
                onChange={onColorChange}
            />
            <span
                style={{ fontSize: '12px', textDecoration: isVisible ? 'none' : 'line-through', flex: 1 }}
            >
                {label}
            </span>
        </div>
    );
};

/**
 * 모듈의 기본 설정값
 */
const defaultSettings = {
    selectedToolKey: "angle",
    // 데이터셋 라벨에 직접 대응하도록 키 변경
    L_ARM: "rgba(255, 0, 0, 1)",
    R_ARM: "rgba(0, 255, 0, 1)",
    L_LEG: "rgba(0, 0, 255, 1)",
    R_LEG: "rgba(255, 255, 0, 1)",
    BODY: "rgba(255, 0, 255, 1)",
    HEAD: "rgba(0, 255, 255, 1)",
    lineWidth: 2, // 그래프 선 굵기 추가
    datasetVisibility: {} // 각 데이터셋의 가시성 상태를 저장
};

/**
 * 출력(View) 컴포넌트: 그래프 캔버스 렌더링 및 데이터 시각화를 담당합니다.
 */
export const PoseGraphView = ({ data, currentFrame, settings, isSettingsOpen, moduleId, visualizerRef }) => {
    const canvasRef = useRef(null);
    const visualizer = useMemo(() => new GraphVisualizer(), []);

    // settings의 COLOR_... 키를 graph.js가 이해하는 데이터 라벨(L_ARM 등)로 매핑
    const resolvedSettings = useMemo(() => ({ ...settings }), [settings]);

    // 공유 Ref에 인스턴스 할당
    useEffect(() => {
        if (visualizerRef) {
            visualizerRef.current = visualizer;
        }
    }, [visualizer, visualizerRef]);

    // 1. 캔버스 초기 설정
    useEffect(() => {
        if (!canvasRef.current) return;
        visualizer.setCanvas(canvasRef.current); // 캔버스 설정
        if (!visualizer.chart) visualizer.setDefault(0, resolvedSettings); // 차트가 없으면 초기화
    }, [visualizer, canvasRef]);

    // 2. 데이터 및 설정 변경 시 그래프 업데이트
    useEffect(() => {
        // 데이터가 없더라도 빈 차트를 유지하거나 초기화하기 위해 settings 변경 시 실행
        const analysisData = data || {};

        const analysisTools = analysisData.analysisTools;
        const currentTool = analysisTools ? analysisTools[settings.selectedToolKey] : null;

        // 분석 도구가 있으면 계산된 데이터를, 없으면 원본 데이터를 사용
        const graphData = currentTool ? currentTool.calc(analysisData) : {};

        // 데이터 주입 및 설정 적용
        visualizer.setData(graphData, resolvedSettings);
        visualizer.drawImageAt(currentFrame);
    }, [data, resolvedSettings, currentFrame, visualizer, settings.selectedToolKey]);

    return (
        <div className="viewer_container" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ flex: 1, minHeight: 0 }}>
                <canvas
                    ref={canvasRef}
                    style={{ width: '100%', height: '100%' }}
                />
            </div>
        </div>
    );
};

/**
 * 설정(Settings) 컴포넌트: 분석 도구 선택 및 범례 UI를 담당합니다.
 */
export const PoseGraphSettings = ({ settings, onSettingsChange, data, moduleId, visualizer }) => {
    const handleToolChange = (e) => {
        onSettingsChange({ ...settings, selectedToolKey: e.target.value });
    };

    // 차트 인스턴스에 의존하지 않고 데이터로부터 직접 범례 라벨을 추출합니다. (초기 렌더링 보장)
    const labels = useMemo(() => {
        if (!data) return [];
        const analysisTools = data.analysisTools;
        const tool = analysisTools?.[settings.selectedToolKey];
        const graphData = tool ? tool.calc(data) : {};
        return Object.keys(graphData);
    }, [data, settings.selectedToolKey]);

    return (
        <div className="flex-view" style={{ flexDirection: 'column', gap: '15px' }}>
            {/* 도구 선택 영역 */}
            <div>
                <label style={{ marginRight: '10px' }}>
                    <strong>도구</strong>:
                </label>
                <select
                    value={settings.selectedToolKey}
                    onChange={handleToolChange}
                    style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #d1d9e6' }}
                >
                    <option value="angle">관절 각도</option>
                    <option value="velocity">관절 이동 속도</option>
                    <option value="angle-velocity">관절 회전 속도</option>
                    <option value="height">관절 높이</option>
                </select>
            </div>

            {/* 선 굵기 설정 추가 */}
            <div style={{ display: 'flex', flexDirection: 'row', gap: '5px', alignItems: 'center' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>선 굵기</label>
                <input
                    type="number"
                    min="1"
                    value={settings.lineWidth || 2}
                    onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        let newLineWidth = settings.lineWidth;
                        if (!isNaN(value) && value > 0) {
                            newLineWidth = value;
                        } else if (e.target.value === '') {
                            newLineWidth = 1;
                        }
                        onSettingsChange({ ...settings, lineWidth: newLineWidth });
                    }}
                    style={{ maxWidth: '70px', padding: '4px', borderRadius: '4px', border: '1px solid #d1d9e6' }}
                />
            </div>

            {/* 그래프 범례 및 색상 선택 영역 (React로 직접 렌더링) */}
            <div>
                <h4 style={{ fontSize: '14px', marginBottom: '10px' }}>그래프 범례</h4>
                <div
                    className="custom-legend-container flex-view"
                    style={{ textAlign: 'left' }}
                >
                    {labels.map((label) => {
                        const isVisible = settings.datasetVisibility?.[label] !== false;
                        const datasetColor = visualizer?.chart?.data?.datasets?.find(d => d.label === label)?.borderColor;

                        return (
                            <LegendItem
                                key={label}
                                label={label}
                                color={settings[label] || datasetColor || "rgba(150,150,150,1)"}
                                isVisible={isVisible}
                                onToggleVisibility={() => {
                                    onSettingsChange({
                                        ...settings,
                                        datasetVisibility: {
                                            ...settings.datasetVisibility,
                                            [label]: !isVisible
                                        }
                                    });
                                }}
                                onColorChange={(newColor) => {
                                    onSettingsChange({
                                        ...settings,
                                        [label]: newColor
                                    });
                                }}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export const PoseGraphModule = {
    id: 'pose-graph',
    title: '자세 그래프',
    View: PoseGraphView,
    Settings: PoseGraphSettings,
    defaultSettings
};

export default PoseGraphModule;