import React, { useState, forwardRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import i18n from '@shared/utils/i18n';
import { Div, styles, vars } from "@shared/bridges/UIBridge";

import { AnalysisModule } from '@packages/cv-val/types/analysis-module';

import ModuleErrorBoundary from '../ModuleErrorBoundary';
import { moduleItemStyles } from '../ModuleContainerItem.styles';

// 모듈 타입별로 로케일 등록 여부를 관리 (중복 등록 방지)
export const registeredModuleTypes = new Set<string>();

interface Props {
  module: AnalysisModule<any>;
  id: string; // 레이아웃 시스템에서 발급한 고유 ID
  data: any;
  currentFrame: number;
  onNextFrame?: () => void;
  onCandidateSelect?: (frameIdx: number, candidateIdx: number, type?: string) => void;
  // React-Grid-Layout Props
  style?: React.CSSProperties;
  className?: string;
  onMouseDown?: React.MouseEventHandler;
  onMouseUp?: React.MouseEventHandler;
  onTouchEnd?: React.TouchEventHandler;
  children?: React.ReactNode;
  isSettingsOpen?: boolean;
  titleNode?: React.ReactNode;
  settings?: any;
  onSettingsChange?: (newSettings: any) => void;
}

const ModuleContainerItem = forwardRef<HTMLDivElement, Props>((props, ref) => {
  const { 
    module, id, data, currentFrame, onNextFrame, onCandidateSelect, isSettingsOpen = false, titleNode,
    style, className, onMouseDown, onMouseUp, onTouchEnd, children,
    settings = module.defaultSettings,
    onSettingsChange
  } = props;

  const { t } = useTranslation();

  // 모듈의 타입 (로케일 및 리소스 식별용)
  const moduleType = module.type;

  // 이미 등록된 리소스인지 확인하여 초기 상태 설정
  const [localesLoaded, setLocalesLoaded] = useState(() => 
    !module.locales || registeredModuleTypes.has(moduleType)
  );

  // 모듈에 정의된 로케일 정보를 i18n에 동적으로 등록
  useEffect(() => {
    const locales = module.locales;
    if (locales && !registeredModuleTypes.has(moduleType)) {
      Object.entries(locales).forEach(([lng, resources]) => {
        i18n.addResourceBundle(lng, 'translation', resources as any, true, true);
      });
      registeredModuleTypes.add(moduleType);
      setLocalesLoaded(true); // 리소스 주입 완료 시 상태 업데이트하여 재렌더링 유도
    } else {
      setLocalesLoaded(true);
    }
  }, [module]);

  const { View, Settings } = module;

  const displayTitle = useMemo(() => {
    return t(`analysisTools.${moduleType}`, module.title);
  }, [moduleType, module.title, t, localesLoaded]);

  // 터치 디바이스 여부 판단 (단순 너비 체크 대신 기능 탐지 사용)
  const isTouchDevice = useMemo(() => {
    const isMobileDist = (import.meta as any).env?.VITE_DIST === 'mobile';
    return isMobileDist || (typeof window !== 'undefined' && (('ontouchstart' in window) || (navigator.maxTouchPoints > 0)));
  }, []);

  return (
    <Div 
      ref={ref} 
      style={{ 
        ...moduleItemStyles.card, 
        backgroundColor: vars.box, 
        borderColor: vars.surface,
        ...style 
      }}
      className={`${className} analysis-grid-item grid-item-card ${isSettingsOpen ? 'isSetting' : ''}`}
    >
      <Div className="item-content no-drag" style={{ width: '100%', height: '100%', position: 'relative', WebkitTouchCallout: 'none' }}>
        {/* 실제 시각화 결과물 */}
        <ModuleErrorBoundary title={displayTitle}>
          <View 
            data={data}
            currentFrame={currentFrame} 
            settings={settings} 
            isSettingsOpen={isSettingsOpen}
            titleNode={titleNode}
            onNextFrame={onNextFrame}
            onCandidateSelect={onCandidateSelect}
          />
        </ModuleErrorBoundary>

        {/* 설정 레이어 (우측 사이드 패널 형태) */}
        {isSettingsOpen && (
          <Div className="grid-item-overlay setting side-panel" style={{
            ...styles.frostedglassmorphism,
            ...moduleItemStyles.sidePanel
          }}>
            {/* data와 currentFrame을 Settings 컴포넌트에 전달 */}
            <ModuleErrorBoundary title={`${displayTitle} Settings`}>
              <Settings 
                settings={settings} 
                onSettingsChange={onSettingsChange || (() => {})} 
                data={data}
              />
            </ModuleErrorBoundary>
          </Div>
        )}
      </Div>

      {/* RGL 리사이즈 핸들을 위한 children */}
      {children}
    </Div>
  );
});

ModuleContainerItem.displayName = 'NewAnalysisGridItem';
export default ModuleContainerItem;
