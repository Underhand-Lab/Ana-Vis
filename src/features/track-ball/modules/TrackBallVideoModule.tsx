import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTrackFrame } from '../hooks/useTrackBallFrame';
import { TrackBallData } from '../../../lib/cv-val/track-ball/track-ball-data';
import CanvasRenderer, { CanvasRendererHandle } from "../../../common/components/ui/CanvasRenderer.tsx";
import { exportVideo } from "../../../common/utils/exportVideo";
import { Div, Button, InputColor, InputCheckbox } from '../../../common/components/ui/UI';
import { AnalysisViewProps, AnalysisSettingsProps, AnalysisModule } from '../../../common/types/analysis';

export interface TrackBallSettings {
    showConfidence: boolean;
    boxColor: string;
    trailColor: string;
    [key: string]: any;
}

const defaultSettings: TrackBallSettings = {
    showConfidence: false,
    boxColor: "rgba(255,0,0,1)",
    trailColor: "rgba(255,255,0,1)"
};

/**
 * 출력(View) 컴포넌트: 캔버스 렌더링을 담당합니다.
 */
export const TrackBallVideoView: React.FC<AnalysisViewProps<TrackBallData, TrackBallSettings>> = ({ data, currentFrame, settings }) => {
    const rendererRef = useRef<CanvasRendererHandle>(null);

    // useTrackFrame 훅 호환성을 위한 가상 인터페이스
    const rendererInterface = useMemo(() => ({
        getCanvas: () => rendererRef.current?.getCanvas() || null
    }), []);

    const { setOptions, getTrackLayer } = useTrackFrame(data);

    // 설정 반영 후 그리기를 강제하기 위한 로컬 상태
    const [drawTick, setDrawTick] = useState(0);

    // 1. 설정값 동기화
    useEffect(() => {
        if (settings) {
            setOptions((prev: any) => ({ ...prev, ...settings }));
            const timerId = setTimeout(() => setDrawTick(t => t + 1), 0);
            return () => clearTimeout(timerId);
        }
    }, [settings, setOptions]);

    const drawImageAt = useCallback((frameIdx: number) => {
        if (!data) return null;
        const rawImages = data.getRawImgList(0);
        const backgroundImage = rawImages ? rawImages[frameIdx] : null;
        if (!backgroundImage) return null;

        const trackLayer = getTrackLayer(frameIdx);
        const compositeCanvas = document.createElement('canvas');
        compositeCanvas.width = backgroundImage.width;
        compositeCanvas.height = backgroundImage.height;
        const ctx = compositeCanvas.getContext('2d');
        if (!ctx) return null;

        ctx.drawImage(backgroundImage, 0, 0);
        if (trackLayer) ctx.drawImage(trackLayer, 0, 0);
        return compositeCanvas;
    }, [data, getTrackLayer]);

    // 2. 실제 그리기 수행
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
 * 설정(Settings) 컴포넌트
 */
export const TrackBallVideoSettings: React.FC<AnalysisSettingsProps<TrackBallData, TrackBallSettings>> = ({ settings, onSettingsChange, data }) => {
    const [isExporting, setIsExporting] = useState(false);

    const dummyRenderer = useMemo(() => ({ getCanvas: () => null }), []);
    const { setOptions, getTrackLayer } = useTrackFrame(data);

    useEffect(() => {
        if (settings) setOptions((prev: any) => ({ ...prev, ...settings }));
    }, [settings, setOptions]);

    const drawImageAt = (frameIdx: number) => {
        if (!data) return null;
        const rawImages = data.getRawImgList(0);
        const backgroundImage = rawImages ? rawImages[frameIdx] : null;
        if (!backgroundImage) return null;

        const trackLayer = getTrackLayer(frameIdx);
        const compositeCanvas = document.createElement('canvas');
        compositeCanvas.width = backgroundImage.width;
        compositeCanvas.height = backgroundImage.height;
        const ctx = compositeCanvas.getContext('2d');
        if (!ctx) return null;

        ctx.drawImage(backgroundImage, 0, 0);
        if (trackLayer) ctx.drawImage(trackLayer, 0, 0);
        return compositeCanvas;
    };

    const handleExport = async () => {
        if (!data || isExporting) return;
        setIsExporting(true);
        await exportVideo(drawImageAt, data.getFrameCnt(), {
            fps: data.getFrameCnt(),
            name: `track_ball_${Date.now()}.mp4`
        });
        setIsExporting(false);
    };

    return (
        <Div className="flex-view" style={{ flexDirection: 'column', gap: '15px' }}>
            <Button onClick={handleExport} disabled={isExporting || !data} style={{ width: '100%', padding: '10px' }}>
                {isExporting ? '저장 중...' : '비디오 저장'}
            </Button>
            <InputCheckbox
                label="Confidence 표시"
                checked={settings.showConfidence}
                onChange={(e) => onSettingsChange({ ...settings, showConfidence: e.target.checked })}
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

export const TrackBallVideoModule: AnalysisModule<TrackBallData, TrackBallSettings> = {
    id: 'track-ball-video',
    title: '동영상',
    View: TrackBallVideoView,
    Settings: TrackBallVideoSettings,
    defaultSettings
};

export default TrackBallVideoModule;