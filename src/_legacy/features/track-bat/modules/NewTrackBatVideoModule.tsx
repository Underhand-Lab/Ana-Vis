import React, { useEffect, useMemo, useState, useCallback } from 'react';

import { TrackBatData } from '../core/track-bat-data.ts';
import { useTrackBatFrame } from '../hooks/useTrackBatFrame.ts';

import { exportVideo } from '@common/utils/exportVideo';
import { VideoModule } from "@common/module/video/VideoModule.tsx";
import { IVideoStrategy } from "@common/types/video-strategy.ts";
import { Div, Button, InputColor, InputNumber }
    from '@common/bridges/UIBridge.ts';
import { AnalysisViewProps, AnalysisSettingsProps, AnalysisModule }
    from '@common/types/analysis-module.ts';

export interface TrackBatSettings {
    batColor: string;
    trailColor: string;
    trailLen: number;
    [key: string]: any;
}

const defaultSettings: TrackBatSettings = {
    batColor: "rgba(255,128,0,0.4)", // Orange
    trailColor: "rgba(0,255,0,0.4)", // Green
    trailLen: 10
};

/**
 * 출력(View) 컴포넌트: 실제 캔버스 렌더링을 담당합니다.
 */
export const TrackBatVideoView: React.FC<AnalysisViewProps<TrackBatData, TrackBatSettings>> = ({ data, currentFrame, settings }) => {
    const { setColors, setTrailLen, getTrailLayer } = useTrackBatFrame(data);

    useEffect(() => {
        if (settings) {
            setColors((prev: any) => ({
                ...prev,
                batColor: settings.batColor,
                trailColor: settings.trailColor
            }));
            setTrailLen(settings.trailLen);
        }
    }, [settings, setColors, setTrailLen]);

    const strategies = useMemo<IVideoStrategy[]>(() => [{
        type: 'bat',
        draw: (ctx, _data, frameIdx) => {
            const trailLayer = getTrailLayer(frameIdx);
            if (trailLayer) ctx.drawImage(trailLayer, 0, 0);
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
            settings={{ bat: settings }}
        />
    );
};

/**
 * 설정(Settings) 컴포넌트: 사용자 UI를 통한 설정 변경을 담당합니다.
 */
export const TrackBatVideoSettings: React.FC<AnalysisSettingsProps<TrackBatData, TrackBatSettings>> = ({ settings, onSettingsChange, data }) => {
    const [isExporting, setIsExporting] = useState(false);
    
    const { setColors, setTrailLen, getTrailLayer } = useTrackBatFrame(data);

    // settings 변경 시 useTrackBatFrame의 시각화 옵션 업데이트
    useEffect(() => {
        if (settings) {
            setColors((prev: any) => ({
                ...prev,
                batColor: settings.batColor,
                trailColor: settings.trailColor
            }));
            setTrailLen(settings.trailLen);
        }
    }, [settings, setColors, setTrailLen]);

    const drawImageAt = (frameIdx: number) => {
        if (!data) return null;
        const rawImgList = data.getRawImgList(0);
        const backgroundImage = rawImgList ? rawImgList[frameIdx] : null;
        if (!backgroundImage) return null;

        const trailLayer = getTrailLayer(frameIdx);

        const compositeCanvas = document.createElement('canvas');
        compositeCanvas.width = backgroundImage.width;
        compositeCanvas.height = backgroundImage.height;
        const ctx = compositeCanvas.getContext('2d');
        if (!ctx) return null;

        ctx.drawImage(backgroundImage, 0, 0);
        if (trailLayer) {
            ctx.drawImage(trailLayer, 0, 0, backgroundImage.width, backgroundImage.height);
        }
        return compositeCanvas;
    };

    const handleExportVideo = async () => {
        if (!data || isExporting) return;
        setIsExporting(true);

        await exportVideo(drawImageAt, data.getFrameCnt(), {
            fps: data.getVideoMetadata(0)?.fps || 30,
            name: `track_bat_video_${Date.now()}.mp4`
        });

        setIsExporting(false);
    };

    return (
        <Div className="flex-view" style={{ flexDirection: 'column', gap: '15px' }}>
            <Button
                onClick={handleExportVideo}
                disabled={isExporting || !data}
                style={{ margin: 0, padding: '8px 15px', width: '100%', cursor: isExporting || !data ? 'not-allowed' : 'pointer' }}
            >
                {isExporting ? '저장 중...' : '비디오 저장'}
            </Button>
            <Div className="control-group">
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Trail Length: </label>
                <InputNumber
                    style={{ width: '60px' }} 
                    value={settings.trailLen}
                    max={data ? data.getFrameCnt() - 1 : 0}
                    onChange={(e) => onSettingsChange({ ...settings, trailLen: parseInt(e.target.value) })}
                />
            </Div>
            <Div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <InputColor
                    label="Bat Color" 
                    value={settings.batColor} 
                    onChange={(c) => onSettingsChange({ ...settings, batColor: c })} 
                />
                <InputColor
                    label="Trail Color" 
                    value={settings.trailColor} 
                    onChange={(c) => onSettingsChange({ ...settings, trailColor: c })} 
                />
            </Div>
        </Div>
    );
};

export const TrackBatVideoModule: AnalysisModule<TrackBatData, TrackBatSettings> = {
    id: 'track-bat-video',
    title: '동영상',
    View: TrackBatVideoView,
    Settings: TrackBatVideoSettings,
    defaultSettings
};

export default TrackBatVideoModule;