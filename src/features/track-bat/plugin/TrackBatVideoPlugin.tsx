import React, { useEffect } from 'react';

import { TrackBatData } from '../core/track-bat-data.ts';
import { useTrackBatFrame } from '../hooks/useTrackBatFrame';

import { Div, InputColor, InputNumber }
    from '@common/bridges/UIBridge.ts';
import { CVValData } from '@/features/cv-val/core/cvval-data.ts';
import { useTranslation } from 'react-i18next';
import { AnalysisSettingsProps } from '@features/cv-val/types/analysis-module';
import { VideoModulePlugin } from '@/features/cv-val/modules/VideoModule.tsx';

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

export class TrackBatVideoPlugin extends VideoModulePlugin<TrackBatSettings> {
    id = 'track-bat-video';
    title = 'track-bat-video'; // Use ID as title for translation key lookup
    defaultSettings = defaultSettings;

    usePluginContext(data: CVValData | null, settings: TrackBatSettings) {
        const { setColors, setTrailLen, getTrailLayer } = useTrackBatFrame(data);

        useEffect(() => {
            if (settings) {
                setColors(prev => ({
                    ...prev,
                    batColor: settings.batColor,
                    trailColor: settings.trailColor
                }));
                setTrailLen(settings.trailLen);
            }
        }, [settings, setColors, setTrailLen]);

        return { getTrailLayer };
    }

    drawOverlay(
        ctx: CanvasRenderingContext2D,
        frameIdx: number,
        _data: TrackBatData,
        _settings: TrackBatSettings,
        context: { getTrailLayer: (idx: number) => HTMLCanvasElement | null }
    ) {
        const trailLayer = context.getTrailLayer(frameIdx);
        if (trailLayer) {
            ctx.drawImage(trailLayer, 0, 0, ctx.canvas.width, ctx.canvas.height);
        }
    }

    getSettingComponent({ settings, onSettingsChange, data }: AnalysisSettingsProps<TrackBatSettings>) {
        const { t } = useTranslation();
        return (
            <>
                <Div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>{t('settings.trackLength')}</label>
                    <InputNumber
                        style={{ width: '60px' }}
                        value={settings.trailLen}
                        max={data ? data.getFrameCnt() - 1 : 0}
                        onChange={(e) => onSettingsChange({ ...settings, trailLen: parseInt(e.target.value) })}
                    />
                </Div>
                <Div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <InputColor
                        label={t('settings.batColor')}
                        value={settings.batColor}
                        onChange={(c) => onSettingsChange({ ...settings, batColor: c })}
                    />
                    <InputColor
                        label={t('settings.trailColor')}
                        value={settings.trailColor}
                        onChange={(c) => onSettingsChange({ ...settings, trailColor: c })}
                    />
                </Div>
            </>
        );
    }
}