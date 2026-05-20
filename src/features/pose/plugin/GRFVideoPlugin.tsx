import React, { useEffect } from 'react';
import { useGRFFrame, GRFSettings } from "../hooks/useGRFFrame";

import { Div, InputNumber, InputCheckbox }
    from '@common/bridges/UIBridge.ts';
import { AnalysisSettingsProps } from '@features/cv-val/types/analysis-module.ts';
import { useTranslation } from 'react-i18next';
import { VideoModulePlugin } from '@/features/cv-val/modules/VideoModule.tsx';
import { Toggle } from '@/common/components/ui-brick/react-web/common/Toggle.tsx';
import { CVValData } from '@/features/cv-val/core/cvval-data.ts';

const defaultSettings: GRFSettings = {
    showGRF: true,
    grfScale: 0.1,
};

export class GRFVideoPlugin extends VideoModulePlugin<GRFSettings> {
    id = 'grf-video';
    title = 'grf-video'; // Use ID as title for translation key lookup
    defaultSettings = defaultSettings;

    usePluginContext(data: CVValData, settings: GRFSettings) {
        const { setOptions, getGRFLayer } = useGRFFrame(data);

        useEffect(() => {
            if (settings) {
                setOptions(settings);
            }
        }, [settings, setOptions]);

        return { getGRFLayer };
    }

    drawOverlay(ctx: CanvasRenderingContext2D, frameIdx: number, _data: any, settings: GRFSettings, context: { getGRFLayer: (idx: number) => HTMLCanvasElement | null }) {
        const grfLayer = context.getGRFLayer(frameIdx);
        
        if (grfLayer) {
            ctx.drawImage(grfLayer, 0, 0);
        }
    }

    getSettingComponent({ settings, onSettingsChange }: AnalysisSettingsProps<GRFSettings>) {
        const { t } = useTranslation();
        return (
            <>
                <InputCheckbox
                    label={t('settings.showGRFArrows')}
                    checked={settings.showGRF === true}
                    onChange={(e) => onSettingsChange({ ...settings, showGRF: e.target.checked })}
                />
                <Div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', width: '80px' }}>{t('settings.arrowScale')}</label>
                    <InputNumber
                        min="0"
                        step="0.01"
                        value={settings.grfScale !== undefined ? settings.grfScale : 0.1}
                        onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            onSettingsChange({ ...settings, grfScale: isNaN(value) ? 0.1 : value });
                        }}
                        style={{ maxWidth: '70px', cursor: 'pointer' }}
                    />
                </Div>
            </>
        );
    }
}