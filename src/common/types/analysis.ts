import React from 'react';

export interface AnalysisViewProps<D, S> {
  isSettingsOpen: boolean,
  data: D | null;
  currentFrame: number;
  settings: S;
}

export interface AnalysisSettingsProps<D, S> {
  settings: S;
  onSettingsChange: (newSettings: S) => void;
  data: D | null;
}

export interface AnalysisModule<D = any, S = any> {
  id: string;
  title: string;
  View: React.FC<AnalysisViewProps<D, S>>;
  Settings: React.FC<AnalysisSettingsProps<D, S>>;
  defaultSettings: S;
}