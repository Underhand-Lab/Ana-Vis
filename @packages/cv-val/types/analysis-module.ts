import React from 'react';
import { CVValData } from '@packages/cv-val/data/cvval-data';

export interface AnalysisViewProps<S> {
  isSettingsOpen: boolean,
  titleNode?: React.ReactNode;
  data: CVValData | null;
  currentFrame: number;
  settings: S;
}

export interface AnalysisSettingsProps<S> {
  settings: S;
  onSettingsChange: (newSettings: S) => void;
  data: CVValData | null;
}

export interface AnalysisModule<S = any> {
  id: string;
  title: string;
  View: React.FC<AnalysisViewProps<S>>;
  Settings: React.FC<AnalysisSettingsProps<S>>;
  defaultSettings: S;
  locales?: Record<string, any>;
  init?: (context: { data: CVValData | null; settings: S }) => void;
  cleanup?: () => void;
}