import React from 'react';
import { CVValData } from '@packages/cv-val/data/cvval-data';
import { EditorModulePlugin } from '@packages/cv-val/modules/EditorModule';
import { TrackBatData } from '@apps/features/track-bat/data/track-bat-data';
import { BatDetectedObject } from '@apps/features/track-bat/types';
import featureName from '@apps/features/track-bat/constant';
import { TrackBatVideoPlugin } from '@apps/features/track-bat/video-plugin/TrackBatVideoPlugin';

const getBoxes = (data: CVValData | null, frameIdx: number) => {
  if (!data?.exist(featureName)) return [];
  const batData = data.get(featureName) as TrackBatData;
  const rawImg = data.getRawImgList(0)?.[frameIdx];

  return batData.getCandidatesAt(frameIdx).map((cand: BatDetectedObject) => {
    if (cand?.bbox && cand.bbox.length >= 4) {
      return { x: cand.bbox[0], y: cand.bbox[1], w: cand.bbox[2], h: cand.bbox[3] };
    }
    if (cand?.maskConfidenceMap && rawImg) {
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
      if (found) {
        const sx = rawImg.width / cols;
        const sy = rawImg.height / rows;
        return { x: minX * sx, y: minY * sy, w: (maxX - minX + 1) * sx, h: (maxY - minY + 1) * sy };
      }
    }
    return { x: 0, y: 0, w: 0, h: 0 };
  });
};

export const TrackBatEditorPlugin: EditorModulePlugin<any> = {
  id: 'edit-track-bat',
  title: 'Edit Track Bat',
  trackType: 'bat',
  videoPlugin: new TrackBatVideoPlugin(),
  defaultSettings: new TrackBatVideoPlugin().defaultSettings,
  getCandidateBoxes: getBoxes,
  getSelectedIdx: (data, frameIdx) => {
    if (!data?.exist(featureName)) return -1;
    const batData = data.get(featureName) as TrackBatData;
    return batData.getBatList()?.[frameIdx]?.selectedIdx ?? -1;
  },
  getEditLayer: (data, frameIdx, selectedIdx) => {
    if (!data?.exist(featureName)) return null;
    const rawImg = data.getRawImgList(0)?.[frameIdx];
    const boxes = getBoxes(data, frameIdx);
    if (!rawImg) return null;
    const canvas = document.createElement('canvas');
    canvas.width = rawImg.width;
    canvas.height = rawImg.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    boxes.forEach((box, idx) => {
      const isSelected = idx === selectedIdx;
      ctx.strokeStyle = isSelected ? '#007bff' : 'rgba(255, 255, 0, 0.7)';
      ctx.lineWidth = isSelected ? 4 : 2;
      ctx.strokeRect(box.x, box.y, box.w, box.h);
      ctx.fillStyle = isSelected ? '#007bff' : 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(box.x, box.y - 25, 35, 25);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 16px Arial';
      ctx.fillText(`${idx + 1}`, box.x + 5, box.y - 7);
    });
    return canvas;
  },
  locales: {
    en: { analysisTools: { 'edit-track-bat': 'Edit Track Bat' } },
    ko: { analysisTools: { 'edit-track-bat': '배트 편집' } },
  },
};

export default TrackBatEditorPlugin;
