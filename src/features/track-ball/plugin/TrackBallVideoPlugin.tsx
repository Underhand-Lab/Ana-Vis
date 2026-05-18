import React, { useEffect } from 'react';
import { useTrackBallFrame } from '../hooks/useTrackBallFrame';
import { TrackBallData } from '../core/track-ball-data';
import { InputColor, InputCheckbox } from '@common/bridges/UIBridge';
import { AnalysisSettingsProps } from '@common/types/analysis-module';
import { VideoModulePlugin } from '@/common/module/VideoModule';
import { CVValData } from '@/common/core/cvval-data';

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

export class TrackBallVideoPlugin extends VideoModulePlugin<TrackBallSettings> {
    id = 'track-ball-video';
    title = '동영상';
    defaultSettings = defaultSettings;

    usePluginContext(data: CVValData | null, settings: TrackBallSettings) {
        const { setOptions, getTrailLayer } = useTrackBallFrame(data);

        useEffect(() => {
            if (settings) {
                setOptions((prev: any) => ({ ...prev, ...settings }));
            }
        }, [settings, setOptions]);

        return { getTrailLayer };
    }

    drawOverlay(ctx: CanvasRenderingContext2D, frameIdx: number, _data: any, _settings: TrackBallSettings, context: { getTrailLayer: (idx: number) => HTMLCanvasElement | null }) {
        const trackLayer = context.getTrailLayer(frameIdx);
        if (trackLayer) {
            ctx.drawImage(trackLayer, 0, 0);
        }
    }

    getSettingComponent({ settings, onSettingsChange }: AnalysisSettingsProps<TrackBallSettings>) {
        return (
            <>
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
            </>
        );
    }
}
