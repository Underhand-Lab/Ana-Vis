import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import CanvasRenderer, { CanvasRendererHandle } from '@shared/components/ui-brick/react-web/custom/CanvasRenderer';
import { Button, Div, InputNumber, InputCheckbox, Toggle } from '@shared/bridges/UIBridge.ts';
import { CVValData } from '@packages/cv-val/data/cvval-data';
import { AnalysisModule, AnalysisSettingsProps, AnalysisViewProps } from '@packages/cv-val/types/analysis-module';
import { VideoModulePlugin } from '@cv-val/modules/VideoModule';

type TrackType = 'ball' | 'bat';

export interface EditorModuleSettings {
  confValue: number;
  advanceOnSelect: boolean;
}

export interface EditorModulePlugin<TSettings = any> {
  id: string;
  title: string;
  trackType: TrackType;
  defaultSettings: TSettings;
  videoPlugin: VideoModulePlugin<any, any>;
  getCandidateBoxes: (data: CVValData | null, frameIdx: number) => { x: number; y: number; w: number; h: number }[];
  getSelectedIdx: (data: CVValData | null, frameIdx: number) => number;
  getEditLayer?: (data: CVValData | null, frameIdx: number, selectedIdx: number) => HTMLCanvasElement | null;
  getEmptyStateMessage?: (data: CVValData | null, currentFrame: number) => React.ReactNode;
  locales?: Record<string, any>;
}

export const createEditorModule = (
  visualPlugins: VideoModulePlugin<any, any>[],
  editorPlugins: EditorModulePlugin<any>[],
  moduleId: string,
  moduleTitle: string
): AnalysisModule<Record<string, any>> => {
  const defaultSettings = {
    moduleSettings: { confValue: 0.5, advanceOnSelect: true },
    ...visualPlugins.reduce((acc, plugin) => ({ ...acc, [plugin.id]: plugin.defaultSettings }), {}),
    ...editorPlugins.reduce((acc, plugin) => ({ ...acc, [plugin.id]: plugin.defaultSettings }), {}),
  };

  const EditorView: React.FC<AnalysisViewProps<Record<string, any>>> = ({ data, currentFrame, settings, onCandidateSelect, onNextFrame }) => {
    const { t } = useTranslation();
    const rendererRef = useRef<CanvasRendererHandle>(null);
    const [renderTick, setRenderTick] = useState(0);
    const trackData = data as CVValData | null;
    const visualPlugin = visualPlugins[0];
    const editorPlugin = editorPlugins[0];
    const visualContext = visualPlugin.usePluginContext(trackData, settings[visualPlugin.id] ?? visualPlugin.defaultSettings);
    const candidates = editorPlugin.getCandidateBoxes(trackData, currentFrame);
    const selectedIdx = editorPlugin.getSelectedIdx(trackData, currentFrame);
    const emptyState = editorPlugin.getEmptyStateMessage?.(trackData, currentFrame) ?? t('common.noDataToDisplay', '선택할 항목이 없습니다.');
    const editLayer = editorPlugin.getEditLayer?.(trackData, currentFrame, selectedIdx) ?? null;

    const handleSelect = (candidateIdx: number) => {
      onCandidateSelect?.(currentFrame, candidateIdx, editorPlugin.trackType);
      setRenderTick(v => v + 1);
      if ((settings.moduleSettings?.advanceOnSelect ?? true)) {
        onNextFrame?.();
      }
    };

    useEffect(() => {
      if (!rendererRef.current || !trackData) return;
      const rawImgList = trackData.getRawImgList(0);
      const backgroundImage = rawImgList ? rawImgList[currentFrame] : null;
      if (!backgroundImage) return;

      const canvas = document.createElement('canvas');
      canvas.width = backgroundImage.width;
      canvas.height = backgroundImage.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const moduleSettings = settings.moduleSettings || { confValue: 0.5 };
      if (moduleSettings.showBackground !== false) {
        ctx.drawImage(backgroundImage, 0, 0);
      } else {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      visualPlugin.drawOverlay(ctx, currentFrame, trackData, settings[visualPlugin.id] ?? visualPlugin.defaultSettings, visualContext);
      if (editLayer) {
        ctx.drawImage(editLayer, 0, 0, canvas.width, canvas.height);
      }

      rendererRef.current.updateLayout(canvas.width, canvas.height);
      rendererRef.current.drawImage(canvas);
    }, [trackData, currentFrame, settings, renderTick, visualContext, editLayer]);

    const bg = trackData?.getRawImgList(0)?.[currentFrame];
    const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
      const canvas = rendererRef.current?.getCanvas();
      if (!canvas || !bg || candidates.length === 0) return;
      const rect = canvas.getBoundingClientRect();
      const canvasAR = rect.width / rect.height;
      const imageAR = bg.width / bg.height;
      let renderW = rect.width;
      let renderH = rect.height;
      let offsetX = 0;
      let offsetY = 0;
      if (imageAR > canvasAR) {
        renderH = rect.width / imageAR;
        offsetY = (rect.height - renderH) / 2;
      } else {
        renderW = rect.height * imageAR;
        offsetX = (rect.width - renderW) / 2;
      }
      const multiplier = bg.width / renderW;
      const rawX = (e.clientX - rect.left - offsetX) * multiplier;
      const rawY = (e.clientY - rect.top - offsetY) * multiplier;
      const tolerance = 10 * multiplier;
      const hit = candidates.findIndex(box =>
        rawX >= box.x - tolerance &&
        rawX <= box.x + box.w + tolerance &&
        rawY >= box.y - tolerance &&
        rawY <= box.y + box.h + tolerance
      );
      if (hit >= 0) handleSelect(hit);
    };

    return (
      <Div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '10px' }}>
        <Div style={{ flex: 1, minHeight: 0, backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden', cursor: 'crosshair' }} onClick={handleCanvasClick}>
          <CanvasRenderer ref={rendererRef} style={{ width: '100%', display: 'block' }} />
        </Div>
        <Div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Button onClick={() => handleSelect(-1)} style={{ backgroundColor: selectedIdx === -1 ? '#007bff' : undefined, color: selectedIdx === -1 ? 'white' : undefined }}>{t('common.none')}</Button>
            {candidates.length > 0 ? candidates.map((_, idx) => (
              <Button key={`${currentFrame}-${idx}`} onClick={() => handleSelect(idx)} style={{ backgroundColor: selectedIdx === idx ? '#007bff' : undefined, color: selectedIdx === idx ? 'white' : undefined }}>{idx + 1}</Button>
            )) : <Div style={{ padding: '8px 2px', color: '#888', fontSize: '13px' }}>{emptyState}</Div>}
          </Div>
        </Div>
      </Div>
    );
  };

  const EditorSettings: React.FC<AnalysisSettingsProps<Record<string, any>>> = ({ settings, onSettingsChange, data }) => {
    const { t } = useTranslation();
    return (
      <Div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {editorPlugins.map(plugin => (
            <Toggle key={plugin.id} title={t(`analysisTools.${plugin.id}`, plugin.title) as string}>
              {plugin.videoPlugin.getSettingComponent({
                settings: settings[plugin.videoPlugin.id] ?? plugin.videoPlugin.defaultSettings,
                onSettingsChange: (newVal: any) => onSettingsChange({ ...settings, [plugin.videoPlugin.id]: newVal }),
                data,
              } as any)}
            </Toggle>
          ))}
        </Div>
        <Div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <InputCheckbox
            label={t('settings.advanceOnSelect', '선택 후 다음 프레임으로 이동')}
            checked={settings.moduleSettings?.advanceOnSelect ?? true}
            onChange={(e) => onSettingsChange({
              ...settings,
              moduleSettings: {
                ...(settings.moduleSettings || { confValue: 0.5 }),
                advanceOnSelect: e.target.checked
              }
            })}
          />
          <Div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label>CONF</label>
            <InputNumber
              value={settings.moduleSettings?.confValue ?? 0.5}
              min="0"
              max="1"
              step="0.01"
              onChange={(e: any) => onSettingsChange({
                ...settings,
                moduleSettings: {
                  ...(settings.moduleSettings || { advanceOnSelect: true }),
                  confValue: parseFloat(e.target.value)
                }
              })}
              style={{ width: '90px' }}
            />
          </Div>
        </Div>
      </Div>
    );
  };

  return {
    id: moduleId,
    title: moduleTitle,
    View: EditorView,
    Settings: EditorSettings,
    defaultSettings,
    locales: [...visualPlugins, ...editorPlugins].reduce((acc, plugin) => {
      if (!plugin.locales) return acc;
      Object.entries(plugin.locales).forEach(([lng, res]) => {
        acc[lng] = acc[lng] || {};
        Object.keys(res).forEach(section => {
          acc[lng][section] = { ...(acc[lng][section] || {}), ...(res as any)[section] };
        });
      });
      return acc;
    }, {} as Record<string, any>),
  };
};

export default createEditorModule;
