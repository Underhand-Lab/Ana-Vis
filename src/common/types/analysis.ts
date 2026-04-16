import { FC } from 'react';

/**
 * 분석 데이터와 현재 프레임, 설정값을 전달받는 View 컴포넌트 Props
 */
export interface AnalysisViewProps<T = any> {
  data: any;
  moduleId: string;
  currentFrame: number;
  settings: T;
  isSettingsOpen: boolean;
  visualizerRef: any;
}

/**
 * 설정값과 변경 핸들러를 전달받는 Settings 컴포넌트 Props
 */
export interface AnalysisSettingsProps<T = any> {
  settings: T;
  data: any;
  currentFrame: number;
  moduleId: string;
  visualizer: any;
  onSettingsChange: (newSettings: T) => void;
}

export interface AnalysisModule<T = any> {
  id: string;
  title: string;
  View: FC<AnalysisViewProps<T>>;
  Settings: FC<AnalysisSettingsProps<T>>;
  defaultSettings: T;
}
