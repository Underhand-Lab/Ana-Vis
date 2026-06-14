import React from 'react';
import { CVValData } from '@packages/cv-val/data/cvval-data';
import { EditorModulePlugin } from '@packages/cv-val/modules/EditorModule';
import { TrackBallData } from '@apps/features/track-ball/data/track-ball-data';
import { DetectedObject } from '@apps/features/track-ball/types';
import featureName from '@apps/features/track-ball/constant';
import { TrackBallVideoPlugin } from '@apps/features/track-ball/plugin/TrackBallVideoPlugin';

const getBoxes = (data: CVValData | null, frameIdx: number) => {
  if (!data?.exist(featureName)) return [];
  const ballData = data.get(featureName) as TrackBallData;
  return ballData.getCandidatesAt(frameIdx)
    .filter((cand: DetectedObject) => !!cand?.bbox && cand.bbox.length >= 4)
    .map((cand: DetectedObject) => ({
      x: cand.bbox[0], y: cand.bbox[1], w: cand.bbox[2], h: cand.bbox[3]
    }));
};

export const TrackBallEditorPlugin: EditorModulePlugin<any> = {
  type: 'edit-track-ball',
  title: 'Edit Track Ball',
  trackType: 'ball',
  videoPlugin: new TrackBallVideoPlugin(),
  defaultSettings: new TrackBallVideoPlugin().defaultSettings,
  getCandidateBoxes: getBoxes,
  getSelectedIdx: (data, frameIdx) => {
    if (!data?.exist(featureName)) return -1;
    const ballData = data.get(featureName) as TrackBallData;
    return ballData.getBallList()?.[frameIdx]?.selectedIdx ?? -1;
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
    en: { analysisTools: { 'edit-track-ball': 'Edit Track Ball' } },
    ko: { analysisTools: { 'edit-track-ball': '볼 편집' } },
  },
};

export default TrackBallEditorPlugin;
