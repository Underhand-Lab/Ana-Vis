import React, { useState, forwardRef, useRef, useEffect, useMemo } from 'react';
import { Div } from "@common/bridges/UIBridge";
import vars from '@/common/components/ui-brick/variables';
import { AnalysisModule } from '@features/cv-val/types/analysis-module';
import { useTranslation } from 'react-i18next';
import i18n from '../../core/i18n';

// 모듈 타입별로 로케일 등록 여부를 관리 (중복 등록 방지)
const registeredModuleTypes = new Set<string>();

/**
 * 개별 분석 모듈의 런타임 에러를 격리하기 위한 Error Boundary
 */
class ModuleErrorBoundary extends React.Component<{ children: React.ReactNode; title: string }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode; title: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error(`Error in module [${this.props.title}]:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100%', 
          padding: '20px',
          textAlign: 'center',
          backgroundColor: 'rgba(255, 0, 0, 0.05)',
        }}>
          <span style={{ fontSize: '24px', marginBottom: '10px' }}>⚠️</span>
          <span style={{ fontWeight: 'bold', fontSize: '14px' }}>오류 발생</span>
          <span style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>{this.props.title} 모듈에서 문제가 발생했습니다.</span>
          <button 
            onClick={() => this.setState({ hasError: false })}
            style={{ marginTop: '12px', padding: '4px 12px', fontSize: '12px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            다시 시도
          </button>
        </Div>
      );
    }
    return this.props.children;
  }
}

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

const AnalysisGridItem = forwardRef<HTMLDivElement, Props>((props, ref) => {
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

  // 시각화 인스턴스를 공유하기 위한 Ref
  const visualizerRef = useRef<any>(null);

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
        ...styles.card, 
        backgroundColor: vars.background, 
        borderColor: vars.surface,
        ...style 
      }}
      className={`${className} analysis-grid-item grid-item-card ${isSettingsOpen ? 'isSetting' : ''}`}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onTouchEnd={onTouchEnd}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 상단 드래그 핸들 오버레이 */}
      <Div 
        className="grid-item-overlay frostedglassmorphism" 
        style={{ ...styles.header, ...((isHovered || isSettingsOpen) ? styles.headerVisible : {}) }}
      >
        <span 
          className="drag-handle" // Make only the title span the drag handle
          style={{ fontSize: '14px', fontWeight: 'bold', color: '#222', cursor: 'grab', flexGrow: 1, textAlign: 'left', textWrap: 'nowrap', overflow: 'visible' }}
        >{displayTitle}</span>
        <Div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={(e) => { e.stopPropagation(); toggleSettings(); }} 
            style={styles.iconButton}
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
          <Div className="grid-item-overlay setting frostedglassmorphism side-panel" style={{
            ...styles.sidePanel
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

const styles: { [key: string]: React.CSSProperties } = {
  card: {
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
    overflow: 'hidden',
    fontFamily: vars.font,
    border: '1px solid',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40px',
    zIndex: 30,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 15px',
    opacity: 0,
    pointerEvents: 'none',
    transition: 'opacity 0.2s ease-in-out',
  },
  headerVisible: {
    opacity: 1,
    pointerEvents: 'auto',
  },
  iconButton: {
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    color: 'white',
    fontSize: '16px',
  },
  sidePanel: {
    position: 'absolute',
    top: '40px',
    right: 0,
    bottom: 0,
    padding: '20px',
    zIndex: 20,
    overflowY: 'auto',
    borderLeft: '1px solid rgba(255,255,255,0.3)',
    color: '#222',
  }
};

AnalysisGridItem.displayName = 'NewAnalysisGridItem';
export default AnalysisGridItem;
