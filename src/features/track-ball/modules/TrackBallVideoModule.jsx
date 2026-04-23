import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTrackFrame } from '../hooks/useTrackBallFrame.jsx';
import { CanvasRenderer } from "../../../lib/cv-val-visualizer/canvas-renderer.js";
import { exportVideo } from "../../../common/utils/exportVideo.jsx";
import { Div, Button, InputColor, InputCheckbox } from '../../../common/components/ui/UI.jsx';

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
        <Div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <canvas ref={canvasRef} style={{ width: '100%', height: '100%', background: 'black', position: 'absolute', top: 0, left: 0 }} />
        </Div>
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
        <Div className="flex-view" style={{ flexDirection: 'column', gap: '15px' }}>
            <Button onClick={handleExport} disabled={isExporting || !data} style={{ width: '100%', padding: '10px' }}>
                {isExporting ? '저장중..' : '비디오 저장'}
            </Button>
            <InputCheckbox
                label="Confidence 표시"
                checked={settings.showConfidence}
                onChange={e => onSettingsChange({...settings, showConfidence: e.target.checked})}
            />
            <InputColor
                label="Box 색상" 
                value={settings.boxColor} 
                onChange={(c) => onSettingsChange({ ...settings, boxColor: c })} 
            />
            <InputColor
                label="Trail 색상" 
                value={settings.trailColor} 
                onChange={(c) => onSettingsChange({ ...settings, trailColor: c })} 
            />
        </Div>
    );
};

export const TrackBallVideoModule = {
    id: 'track-ball-video',
    title: '동영상',
    View: TrackBallVideoView,
    Settings: TrackBallVideoSettings,
    defaultSettings
};

export default TrackBallVideoModule;