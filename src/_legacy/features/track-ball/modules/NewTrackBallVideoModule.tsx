import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTrackBallFrame } from '../hooks/useTrackBallFrame.ts';
import { TrackBallData } from '../core/track-ball-data';
import { VideoModule } from "@common/module/video/VideoModule.tsx";
import { IVideoStrategy } from "@common/types/video-strategy.ts";
import { exportVideo } from "@common/utils/exportVideo";
import { Div, Button, InputColor, InputCheckbox } from '@common/bridges/UIBridge';
import { AnalysisViewProps, AnalysisSettingsProps, AnalysisModule } from '@common/types/analysis-module';

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
    const { setOptions, getTrailLayer } = useTrackBallFrame(data);

    useEffect(() => {
        if (settings) setOptions((prev: any) => ({ ...prev, ...settings }));
    }, [settings, setOptions]);

    const strategies = useMemo<IVideoStrategy[]>(() => [{
        type: 'ball',
        draw: (ctx, _data, frameIdx) => {
            const trackLayer = getTrailLayer(frameIdx);
            if (trackLayer) ctx.drawImage(trackLayer, 0, 0);
        }
    }], [getTrailLayer]);

    const cvValDataAdapter = useMemo(() => ({
        get: () => data,
        exist: () => !!data
    }), [data]);

    return (
        <VideoModule
            cvValData={cvValDataAdapter as any}
            currentFrame={currentFrame}
            strategies={strategies}
            settings={{ ball: settings }}
        />
    );
};

/**
 * 설정(Settings) 컴포넌트
 */
export const TrackBallVideoSettings: React.FC<AnalysisSettingsProps<TrackBallData, TrackBallSettings>> = ({ settings, onSettingsChange, data }) => {
    const [isExporting, setIsExporting] = useState(false);

    const dummyRenderer = useMemo(() => ({ getCanvas: () => null }), []);
    const { setOptions, getTrailLayer } = useTrackBallFrame(data);

    useEffect(() => {
        if (settings) setOptions((prev: any) => ({ ...prev, ...settings }));
    }, [settings, setOptions]);

    const drawImageAt = (frameIdx: number) => {
        if (!data) return null;
        const rawImages = data.getRawImgList(0);
        const backgroundImage = rawImages ? rawImages[frameIdx] : null;
        if (!backgroundImage) return null;

        const trackLayer = getTrailLayer(frameIdx);
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
            fps: data.getVideoMetadata(0).fps,
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