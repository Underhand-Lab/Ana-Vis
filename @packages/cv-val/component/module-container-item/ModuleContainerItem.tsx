import React, { useState, forwardRef, useEffect, useMemo } from 'react';
import { Div, styles, vars } from "@shared/bridges/UIBridge";
import { AnalysisModule } from '@packages/cv-val/types/analysis-module';
import { useTranslation } from 'react-i18next';
import i18n from '../../../../@shared/utils/i18n';
import ModuleErrorBoundary from './ModuleErrorBoundary';
import { moduleItemStyles } from './ModuleContainerItem.styles';

// 모듈 타입별로 로케일 등록 여부를 관리 (중복 등록 방지)
const registeredModuleTypes = new Set<string>();

interface Props {
  module: AnalysisModule;
  data: any;
  currentFrame: number;
  // React-Grid-Layout Props
  style?: React.CSSProperties;
  className?: string;
  onMouseDown?: React.MouseEventHandler;
  onMouseUp?: React.MouseEventHandler;
  onTouchEnd?: React.TouchEventHandler;
  children?: React.ReactNode;
  onRemove: (id: string) => void;
}

const ModuleContainerItem = forwardRef<HTMLDivElement, Props>((props, ref) => {
  const { 
    module, data, currentFrame, onRemove,
    style, className, onMouseDown, onMouseUp, onTouchEnd, children 
  } = props;

  const { t } = useTranslation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [settings, setSettings] = useState(module.defaultSettings);

  // 모듈의 베이스 ID 추출 (예: 'pose-17123...' -> 'pose')
  const moduleType = useMemo(() => {
    const lastHyphenIndex = module.id.lastIndexOf('-');
    return (lastHyphenIndex !== -1 && !isNaN(Number(module.id.substring(lastHyphenIndex + 1))))
      ? module.id.substring(0, lastHyphenIndex)
      : module.id;
  }, [module.id]);

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

  // 모듈의 생명주기 관리 (Init & Cleanup)
  useEffect(() => {
    // 1. 초기화 메서드 호출
    // 시각화 모듈의 초기 설정에 필요한 data나 settings가 있다면 전달할 수 있습니다.
    if (module.init) {
      module.init({ data, settings }); 
    }

    return () => {
      // 2. 자원 해제 메서드 호출
      if (module.cleanup) {
        module.cleanup();
      }
    };
  }, [module.id]); // 모듈이 변경되거나 삭제될 때만 실행

  const { View, Settings } = module;

  const displayTitle = useMemo(() => {
    return t(`analysisTools.${moduleType}`, module.title);
  }, [moduleType, module.title, t, localesLoaded]);

  const toggleSettings = () => setIsSettingsOpen((prev) => !prev);

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
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onTouchEnd={onTouchEnd}
    >
      {/* 상단 드래그 핸들 오버레이 */}
      <Div 
        className="grid-item-overlay"
        style={{ ...styles.frostedglassmorphism, ...moduleItemStyles.header, ...((isHovered || isSettingsOpen) ? moduleItemStyles.headerVisible : {}) }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <span 
          className="drag-handle" // Make only the title span the drag handle
          style={{ fontSize: '14px', fontWeight: 'bold', color: '#222', cursor: 'grab', flexGrow: 1, textAlign: 'left', textWrap: 'nowrap', overflow: 'visible' }}
        >{displayTitle}</span>
        <Div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={(e) => { e.stopPropagation(); toggleSettings(); }} 
            style={moduleItemStyles.iconButton}
          >
            ⚙️
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onRemove(module.id); }} 
            style={{ 
                border: 'none', 
                background: 'none', 
                cursor: 'pointer', 
                color: vars.text, 
                fontSize: '16px' 
            }}
          >
            ✕
          </button>
        </Div>
      </Div>

      <Div className="item-content no-drag" style={{ width: '100%', height: '100%', position: 'relative' }}>
        {/* 실제 시각화 결과물 */}
        <ModuleErrorBoundary title={displayTitle}>
          <View 
            data={data}
            currentFrame={currentFrame} 
            settings={settings} 
            isSettingsOpen={isSettingsOpen}
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
                onSettingsChange={setSettings} 
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
