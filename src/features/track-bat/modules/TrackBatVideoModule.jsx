import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { useTrackBatFrame } from '../hooks/useTrackBatFrame.jsx';
import { CanvasRenderer } from "../../../lib/cv-val-visualizer/canvas-renderer.js";
import { exportVideo } from '../../../common/utils/exportVideo.jsx';
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
                <span style={{ fontSize: '12px' }}>{label}</span>
            </div>
            {isOpen && (
                <div style={{ position: 'absolute', zIndex: 100, top: '35px', left: 0 }}>
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
    batColor: "rgba(255,128,0,1)", // Orange
    // batAlpha: 100, // Removed
    trailColor: "rgba(0,255,0,1)", // Green
    // trailAlpha: 100, // Removed
    trailLen: 10
};

/**
 * 출력(View) 컴포넌트
 */
export const TrackBatVideoView = ({ data, currentFrame, settings }) => {
    const canvasRef = useRef(null);
    const renderer = useMemo(() => new CanvasRenderer(), []);
    // useTrackBatFrame 훅은 data와 renderer를 받지 않고, 내부적으로 data를 사용하며,
    // setColors, setTrailLen을 통해 시각화 옵션을 업데이트합니다.
    const { setColors, setTrailLen, getTrailLayer } = useTrackBatFrame(data, renderer);

    // 렌더러에 캔버스 바인딩
    useEffect(() => {
        if (canvasRef.current) {
            renderer.setCanvas(canvasRef.current);
        }
    }, [renderer]);

    // settings 변경 시 useTrackBatFrame의 시각화 옵션 업데이트
    useEffect(() => {
        if (settings) {
            setColors({ batColor: settings.batColor, trailColor: settings.trailColor });
            setTrailLen(settings.trailLen);
        }
    }, [settings, setColors, setTrailLen]);

    // 원본 이미지와 레이어를 합성하는 공통 함수
    const drawImageAt = useCallback((frameIdx) => {
        if (!data) return null;

        const rawImgList = data.getRawImgList(0);
        const backgroundImage = rawImgList ? rawImgList[frameIdx] : null;
        if (!backgroundImage) return null;

        const trailLayer = getTrailLayer(frameIdx);

        const compositeCanvas = document.createElement('canvas');
        compositeCanvas.width = backgroundImage.width;
        compositeCanvas.height = backgroundImage.height;
        const ctx = compositeCanvas.getContext('2d');

        ctx.drawImage(backgroundImage, 0, 0);
        if (trailLayer) {
            ctx.drawImage(trailLayer, 0, 0, backgroundImage.width, backgroundImage.height);
        }

        return compositeCanvas;
    }, [data, getTrailLayer]);

    // 화면 렌더링 로직
    useEffect(() => {
        const updateFrame = async () => {
            const composite = await drawImageAt(currentFrame);
            if (composite && renderer) {
                renderer.updateLayout(composite.width, composite.height);
                renderer.drawImage(composite);
            }
        };
        updateFrame();
    }, [currentFrame, drawImageAt, renderer]);

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <canvas ref={canvasRef} style={{ width: '100%', height: "100%", display: 'block', backgroundColor: 'black', position: 'absolute', top: 0 }} />
        </div>
    );
};

/**
 * 설정(Settings) 컴포넌트
 */
export const TrackBatVideoSettings = ({ settings, onSettingsChange, data }) => {
    const [isExporting, setIsExporting] = useState(false);
    const renderer = useMemo(() => new CanvasRenderer(), []);
    // Settings 컴포넌트도 자체적으로 useTrackBatFrame 인스턴스를 가집니다.
    const { setColors, setTrailLen, getTrailLayer } = useTrackBatFrame(data, renderer);

    // settings 변경 시 useTrackBatFrame의 시각화 옵션 업데이트
    useEffect(() => {
        if (settings) {
            setColors({ batColor: settings.batColor, trailColor: settings.trailColor });
            setTrailLen(settings.trailLen);
        }
    }, [settings, setColors, setTrailLen]);

    const handleExportVideo = async () => {
        if (!data || isExporting) return;

        setIsExporting(true);

        const drawImageAt = (frameIdx) => {
            if (!data) return null;
            const rawImgList = data.getRawImgList(0);
            const backgroundImage = rawImgList ? rawImgList[frameIdx] : null;
            if (!backgroundImage) return null;

            const trailLayer = getTrailLayer(frameIdx);

            const compositeCanvas = document.createElement('canvas');
            compositeCanvas.width = backgroundImage.width;
            compositeCanvas.height = backgroundImage.height;
            const ctx = compositeCanvas.getContext('2d');

            ctx.drawImage(backgroundImage, 0, 0);
            if (trailLayer) {
                ctx.drawImage(trailLayer, 0, 0, backgroundImage.width, backgroundImage.height);
            }
            return compositeCanvas;
        };

        await exportVideo(drawImageAt, data.getFrameCnt(), {
            fps: data.fps,
            name: `track_bat_video_${Date.now()}.mp4`
        });

        setIsExporting(false);
    };

    return (
        <div className="flex-view" style={{ flexDirection: 'column', gap: '15px' }}>
            <button
                onClick={handleExportVideo}
                disabled={isExporting || !data}
                style={{ width: '100%', cursor: isExporting || !data ? 'not-allowed' : 'pointer' }}
            >
                {isExporting ? '저장중..' : '비디오 저장'}
            </button>
            {/* 궤적 길이 조절 */}
            <div className="control-group">
                <label>Trail Length: </label>
                <input style={{ width: '60px' }} type="number" pattern="\d*"
                    inputMode="decimal" step="1"
                    value={settings.trailLen}
                    max={data?.getFrameCnt() - 1 || 0}
                    onChange={(e) => onSettingsChange({ ...settings, trailLen: parseInt(e.target.value) })}
                />
            </div>

            <ColorPickerItem 
                label="Bat Color" 
                value={settings.batColor} 
                onChange={(c) => onSettingsChange({ ...settings, batColor: c })} 
            />
            <ColorPickerItem 
                label="Trail Color" 
                value={settings.trailColor} 
                onChange={(c) => onSettingsChange({ ...settings, trailColor: c })} 
            />
        </div>
    );
};

export const TrackBatVideoModule = {
    id: 'track-bat-video',
    title: '배트 궤적 비디오',
    View: TrackBatVideoView,
    Settings: TrackBatVideoSettings,
    defaultSettings
};

export default TrackBatVideoModule;
