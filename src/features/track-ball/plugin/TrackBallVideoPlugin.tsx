import React, { useEffect } from 'react';
import { useTrackBallFrame } from '../hooks/useTrackBallFrame';
import { TrackBallData } from '../core/track-ball-data';
import { InputColor, InputCheckbox } from '@common/bridges/UIBridge';
import { AnalysisSettingsProps } from '@features/cv-val/types/analysis-module';
import { useTranslation } from 'react-i18next';
import { VideoModulePlugin } from '@/features/cv-val/modules/VideoModule';
import { CVValData } from '@/features/cv-val/core/cvval-data';

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
    title = 'track-ball-video'; // Use ID as title for translation key lookup
    defaultSettings = defaultSettings;

    locales = {
        en: {
            analysisTools: { "track-ball-video": "Ball Tracking" },
            settings: {
                showConfidence: "Show Confidence",
                boxColor: "Box Color",
                trailColor: "Trail Color"
            }
        },
        ko: {
            analysisTools: { "track-ball-video": "공 추적" },
            settings: {
                showConfidence: "신뢰도 표시",
                boxColor: "박스 색상",
                trailColor: "궤적 색상"
            }
        }
    };

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
        const { t } = useTranslation();
        return (
            <>
                <InputCheckbox
                    label={t('settings.showConfidence')}
                    checked={settings.showConfidence}
                    onChange={(e) => onSettingsChange({ ...settings, showConfidence: e.target.checked })}
                />
                <InputColor
                    label={t('settings.boxColor')}
                    value={settings.boxColor} 
                    onChange={(c) => onSettingsChange({ ...settings, boxColor: c })} 
                />
                <InputColor
                    label={t('settings.trailColor')}
                    value={settings.trailColor} 
                    onChange={(c) => onSettingsChange({ ...settings, trailColor: c })} 
                />
            </>
        );
    }
}
