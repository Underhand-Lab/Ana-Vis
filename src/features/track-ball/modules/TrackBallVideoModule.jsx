import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTrackFrame } from '../hooks/useTrackBallFrame.jsx';
import { CanvasRenderer } from "../../../lib/cv-val-visualizer/canvas-renderer.js";
import { exportVideo } from "../../../common/utils/exportVideo.jsx";
import { RgbaColorPicker } from "react-colorful";

const parseRgba = (rgbaStr) => {
    if (!rgbaStr || typeof rgbaStr !== 'string') return { r: 255, g: 255, b: 255, a: 1 };
    const match = rgbaStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!match) return { r: 255, g: 255, b: 255, a: 1 };
    return {
        r: parseInt(match[1], 10), g: parseInt(match[2], 10), b: parseInt(match[3], 10),
        a: match[4] ? parseFloat(match[4]) : 1
    };
};

const ColorPickerItem = ({ label, value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
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
                    <RgbaColorPicker 
                        color={parseRgba(value)} 
                        onChange={(c) => onChange(`rgba(${c.r},${c.g},${c.b},${c.a})`)} 
                    />
                </div>
            )}
        </div>
    );
};

const defaultSettings = {
    showConfidence: false,
    boxColor: "rgba(255,0,0,1)",
    trailColor: "rgba(255,255,0,1)"
};

/**
 * 출력(View) 컴포넌트
 */
export const TrackBallVideoView = ({ data, currentFrame, settings }) => {
    const canvasRef = useRef(null);
    const renderer = useMemo(() => new CanvasRenderer(), []);
    const { setOptions, getTrackLayer } = useTrackFrame(data, renderer);

    // 설정 반영 후 그리기를 강제하기 위한 로컬 상태
    const [drawTick, setDrawTick] = useState(0);

    useEffect(() => {
        if (settings) {
            setOptions(prev => ({ ...prev, ...settings }));
            const timerId = setTimeout(() => setDrawTick(t => t + 1), 0);
            return () => clearTimeout(timerId);
        }
    }, [settings, setOptions]);

    useEffect(() => {
        if (canvasRef.current) renderer.setCanvas(canvasRef.current);
    }, [renderer]);

    const drawImageAt = useMemo(() => (frameIdx) => {
        if (!data) return null;
        const rawImages = data.getRawImgList(0);
        const backgroundImage = rawImages ? rawImages[frameIdx] : null;
        if (!backgroundImage) return null;

        const trackLayer = getTrackLayer(frameIdx);
        const compositeCanvas = document.createElement('canvas');
        compositeCanvas.width = backgroundImage.width;
        compositeCanvas.height = backgroundImage.height;
        const ctx = compositeCanvas.getContext('2d');

        ctx.drawImage(backgroundImage, 0, 0);
        if (trackLayer) ctx.drawImage(trackLayer, 0, 0);
        return compositeCanvas;
    }, [data, getTrackLayer]);

    useEffect(() => {
        const update = async () => {
            const composite = await drawImageAt(currentFrame);
            if (composite && renderer) {
                renderer.updateLayout(composite.width, composite.height);
                renderer.drawImage(composite);
            }
        };
        update();
    }, [currentFrame, drawImageAt, renderer, drawTick]);

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <canvas ref={canvasRef} style={{ width: '100%', height: '100%', background: 'black', position: 'absolute', top: 0, left: 0 }} />
        </div>
    );
};

/**
 * 설정(Settings) 컴포넌트
 */
export const TrackBallVideoSettings = ({ settings, onSettingsChange, data }) => {
    const [isExporting, setIsExporting] = useState(false);
    const renderer = useMemo(() => new CanvasRenderer(), []);
    const { setOptions, getTrackLayer } = useTrackFrame(data, renderer);

    useEffect(() => {
        if (settings) setOptions(prev => ({ ...prev, ...settings }));
    }, [settings, setOptions]);

    const drawImageAt = (frameIdx) => {
        if (!data) return null;
        const rawImages = data.getRawImgList(0);
        const backgroundImage = rawImages ? rawImages[frameIdx] : null;
        if (!backgroundImage) return null;

        const trackLayer = getTrackLayer(frameIdx);
        const compositeCanvas = document.createElement('canvas');
        compositeCanvas.width = backgroundImage.width;
        compositeCanvas.height = backgroundImage.height;
        const ctx = compositeCanvas.getContext('2d');

        ctx.drawImage(backgroundImage, 0, 0);
        if (trackLayer) ctx.drawImage(trackLayer, 0, 0);
        return compositeCanvas;
    };

    const handleExport = async () => {
        if (!data || isExporting) return;
        setIsExporting(true);
        await exportVideo(drawImageAt, data.getFrameCnt(), {
            fps: data.fps,
            name: `track_ball_${Date.now()}.mp4`
        });
        setIsExporting(false);
    };

    return (
        <div className="flex-view" style={{ flexDirection: 'column', gap: '15px' }}>
            <button onClick={handleExport} disabled={isExporting || !data} style={{ width: '100%', padding: '10px' }}>
                {isExporting ? '저장중..' : '비디오 저장'}
            </button>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" checked={settings.showConfidence} onChange={e => onSettingsChange({...settings, showConfidence: e.target.checked})} />
                Confidence 표시
            </label>
            <ColorPickerItem 
                label="Box 색상" 
                value={settings.boxColor} 
                onChange={(c) => onSettingsChange({ ...settings, boxColor: c })} 
            />
            <ColorPickerItem 
                label="Trail 색상" 
                value={settings.trailColor} 
                onChange={(c) => onSettingsChange({ ...settings, trailColor: c })} 
            />
        </div>
    );
};

export const TrackBallVideoModule = {
    id: 'track-ball-video',
    title: '공 추적 비디오',
    View: TrackBallVideoView,
    Settings: TrackBallVideoSettings,
    defaultSettings
};

export default TrackBallVideoModule;