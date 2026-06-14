import React from 'react';
import { CVValData } from '@packages/cv-val/data/cvval-data';

export interface AnalysisViewProps<S> {
  isSettingsOpen: boolean,
  titleNode?: React.ReactNode;
  data: CVValData | null;
  currentFrame: number;
  settings: S;
  onNextFrame?: () => void;
  onCandidateSelect?: (frameIdx: number, candidateIdx: number, type?: string) => void;
}

export interface AnalysisSettingsProps<S> {
  settings: S;
  onSettingsChange: (newSettings: S) => void;
  data: CVValData | null;
}

export interface AnalysisModule<S = any> {
  type: string;
  title: string;
  View: React.FC<AnalysisViewProps<S>>;
  Settings: React.FC<AnalysisSettingsProps<S>>;
  defaultSettings: S;
  locales?: Record<string, any>;
  init?: (context: { data: CVValData | null; settings: S }) => void;
  cleanup?: () => void;
}
