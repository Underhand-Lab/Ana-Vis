import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AnalysisModule, AnalysisSettingsProps, AnalysisViewProps } from '@packages/cv-val/types/analysis-module';
import { CVValData } from '@packages/cv-val/data/cvval-data';
import CanvasRenderer, { CanvasRendererHandle } from '@shared/components/ui-brick/react-web/custom/CanvasRenderer';
import { Button, Div, InputNumber, Toggle } from '@shared/bridges/UIBridge.ts';

type TrackType = 'ball' | 'bat';

export interface EditorFrameApi {
  getTrailLayer: (idx: number, length?: number) => HTMLCanvasElement | null;
  getEditLayer: (idx: number, candidates: any[], selectedIdx: number) => HTMLCanvasElement | null;
}

export interface EditorModuleSettings {
  confValue: number;
}

export interface EditorModuleOptions {
  id: string;
  title: string;
  trackType: TrackType;
  useFrameApi: (data: CVValData | null) => EditorFrameApi;
  getEmptyStateMessage?: (data: CVValData | null, currentFrame: number) => React.ReactNode;
  locales?: Record<string, any>;
}

const createDefaultSettings = (): EditorModuleSettings => ({ confValue: 0.5 });

export const createEditorModule = (options: EditorModuleOptions): AnalysisModule<EditorModuleSettings> => {
  const EditorView: React.FC<AnalysisViewProps<EditorModuleSettings>> = ({ data, currentFrame, settings, onNextFrame, onCandidateSelect }) => {
    const { t } = useTranslation();
    const rendererRef = useRef<CanvasRendererHandle>(null);
    const [renderTick, setRenderTick] = useState(0);
    const trackData = data as CVValData | null;
    const frameApi = options.useFrameApi(trackData);
    const featureData = trackData?.exist(options.trackType) ? (trackData.get(options.trackType) as any) : null;
    const candidates = featureData?.getCandidatesAt?.(currentFrame) || [];
    const selectedIdx = featureData?.getBallList?.()?.[currentFrame]?.selectedIdx
      ?? featureData?.getBatList?.()?.[currentFrame]?.selectedIdx
      ?? -1;
    const hasCandidates = candidates.length > 0;
    const emptyState = options.getEmptyStateMessage?.(trackData, currentFrame) ?? t('common.noDataToDisplay', '선택할 항목이 없습니다.');
    const candidateBoxes = candidates.map((cand: any) => {
      if (cand?.bbox && typeof cand.bbox[0] === 'number' && cand.bbox.length >= 4) {
        return { x: cand.bbox[0], y: cand.bbox[1], w: cand.bbox[2], h: cand.bbox[3] };
      }
      if (cand?.maskConfidenceMap) {
        const rows = cand.maskConfidenceMap.length;
        const cols = cand.maskConfidenceMap[0].length;
        let minX = cols, maxX = 0, minY = rows, maxY = 0;
        let found = false;
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            if (cand.maskConfidenceMap[y][x] > 0.1) {
              minX = Math.min(minX, x);
              maxX = Math.max(maxX, x);
              minY = Math.min(minY, y);
              maxY = Math.max(maxY, y);
              found = true;
            }
          }
        }
        if (found && trackData?.getRawImgList(0)?.[currentFrame]) {
          const img = trackData.getRawImgList(0)![currentFrame];
          const sx = img.width / cols;
          const sy = img.height / rows;
          return { x: minX * sx, y: minY * sy, w: (maxX - minX + 1) * sx, h: (maxY - minY + 1) * sy };
        }
      }
      return { x: 0, y: 0, w: 0, h: 0 };
    });

    const handleCandidateSelect = (frameIdx: number, candidateIdx: number) => {
      if (!trackData || !trackData.exist(options.trackType)) return;
      onCandidateSelect?.(frameIdx, candidateIdx, options.trackType);
      setRenderTick(v => v + 1);
      if (candidateIdx >= 0) onNextFrame?.();
    };

    useEffect(() => {
      if (!rendererRef.current || !trackData) return;
      const rawImgList = trackData.getRawImgList(0);
      const backgroundImage = rawImgList ? rawImgList[currentFrame] : null;
      if (!backgroundImage || !trackData.exist(options.trackType)) return;

      const overlay = frameApi.getEditLayer(currentFrame, candidates, selectedIdx) || frameApi.getTrailLayer(currentFrame, 1);

      const canvas = document.createElement('canvas');
      canvas.width = backgroundImage.width;
      canvas.height = backgroundImage.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(backgroundImage, 0, 0);
      if (overlay) ctx.drawImage(overlay, 0, 0, backgroundImage.width, backgroundImage.height);
      rendererRef.current.updateLayout(canvas.width, canvas.height);
      rendererRef.current.drawImage(canvas);
    }, [trackData, currentFrame, frameApi, settings.confValue, renderTick]);

    return (
      <Div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '10px' }}>
        <Div
          style={{ flex: 1, minHeight: 0, backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden', cursor: 'crosshair' }}
          onClick={(e: React.MouseEvent<HTMLDivElement>) => {
            const canvas = rendererRef.current?.getCanvas();
            if (!canvas || !trackData || !featureData || candidateBoxes.length === 0) return;
            const rawImgList = trackData.getRawImgList(0);
            const backgroundImage = rawImgList ? rawImgList[currentFrame] : null;
            if (!backgroundImage) return;
            const rect = canvas.getBoundingClientRect();
            const canvasW = rect.width;
            const canvasH = rect.height;
            const canvasAR = canvasW / canvasH;
            const imageAR = backgroundImage.width / backgroundImage.height;
            let renderW = canvasW;
            let renderH = canvasH;
            let offsetX = 0;
            let offsetY = 0;
            if (imageAR > canvasAR) {
              renderH = canvasW / imageAR;
              offsetY = (canvasH - renderH) / 2;
            } else {
              renderW = canvasH * imageAR;
              offsetX = (canvasW - renderW) / 2;
            }
            const multiplier = backgroundImage.width / renderW;
            const rawX = (e.clientX - rect.left - offsetX) * multiplier;
            const rawY = (e.clientY - rect.top - offsetY) * multiplier;
            const toleranceX = 10 * multiplier;
            const toleranceY = 10 * multiplier;
            const hit = candidateBoxes.findIndex((box) => {
              const minX = box.x;
              const minY = box.y;
              const maxX = box.x + box.w;
              const maxY = box.y + box.h;
              return rawX >= minX - toleranceX && rawX <= maxX + toleranceX && rawY >= minY - toleranceY && rawY <= maxY + toleranceY;
            });
            if (hit >= 0) handleCandidateSelect(currentFrame, hit);
          }}
        >
          <CanvasRenderer ref={rendererRef} style={{ width: '100%', display: 'block' }} />
        </Div>
        <Div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Button
              onClick={() => handleCandidateSelect(currentFrame, -1)}
              style={{
                backgroundColor: selectedIdx === -1 ? '#007bff' : undefined,
                color: selectedIdx === -1 ? 'white' : undefined
              }}
            >
              {t('common.none')}
            </Button>
            {hasCandidates ? candidates.map((cand: any, idx: number) => (
              <Button
                key={`${currentFrame}-${idx}`}
                onClick={() => handleCandidateSelect(currentFrame, idx)}
                style={{
                  backgroundColor: selectedIdx === idx ? '#007bff' : undefined,
                  color: selectedIdx === idx ? 'white' : undefined
                }}
              >
                {idx + 1}
              </Button>
            )) : (
              <Div style={{ padding: '8px 2px', color: '#888', fontSize: '13px' }}>
                {emptyState}
              </Div>
            )}
          </Div>
        </Div>
      </Div>
    );
  };

  const EditorSettings: React.FC<AnalysisSettingsProps<EditorModuleSettings>> = ({ settings, onSettingsChange, data }) => {
    const { t } = useTranslation();
    const trackData = data as CVValData | null;
    const hasTrack = !!trackData?.exist(options.trackType);

    useEffect(() => {
      if (!hasTrack) return;
      const featureData = trackData?.get(options.trackType) as any;
      const currentConf = featureData?.getConf?.();
      if (typeof currentConf === 'number' && currentConf !== settings.confValue) {
        onSettingsChange({ ...settings, confValue: currentConf });
      }
    }, [hasTrack, settings.confValue, trackData]);

    return (
      <Div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <Toggle title={t('navigation.edit')}>
          <Div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Button disabled>{options.trackType === 'ball' ? 'Ball' : 'Bat'}</Button>
          </Div>
        </Toggle>
        <Div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label>CONF</label>
          <InputNumber
            value={settings.confValue}
            min="0"
            max="1"
            step="0.01"
            onChange={(e: any) => onSettingsChange({ ...settings, confValue: parseFloat(e.target.value) })}
            style={{ width: '90px' }}
          />
        </Div>
      </Div>
    );
  };

    return {
      id: options.id,
      title: options.title,
      View: EditorView,
      Settings: EditorSettings,
      defaultSettings: createDefaultSettings(),
      locales: options.locales,
    };
};

export default createEditorModule;
