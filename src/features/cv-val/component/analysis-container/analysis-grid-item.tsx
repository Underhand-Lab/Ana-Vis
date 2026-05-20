import React, { useState, forwardRef, useRef, useEffect, useMemo } from 'react';
import { Div } from "@common/bridges/UIBridge";
import vars from '@/common/components/ui-brick/variables';
import { AnalysisModule } from '@features/cv-val/types/analysis-module';
import { useTranslation } from 'react-i18next';
import i18n from '../../core/i18n';

// 모듈별 로케일 정보가 이미 i18n에 등록되었는지 추적하기 위한 집합
const registeredLocales = new WeakSet<object>();

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
  // 이미 등록된 리소스인지 확인하여 초기 상태 설정
  const [localesLoaded, setLocalesLoaded] = useState(() => 
    !module.locales || registeredLocales.has(module.locales)
  );

  // 모듈에 정의된 로케일 정보를 i18n에 동적으로 등록
  useEffect(() => {
    const locales = module.locales;
    if (locales && !registeredLocales.has(locales)) {
      Object.entries(locales).forEach(([lng, resources]) => {
        i18n.addResourceBundle(lng, 'translation', resources as any, true, true);
      });
      // locales 객체 참조를 저장하여 동일 타입 모듈의 중복 등록 방지
      registeredLocales.add(locales);
      setLocalesLoaded(true); // 리소스 주입 완료 시 상태 업데이트하여 재렌더링 유도
    } else {
      setLocalesLoaded(true);
    }
  }, [module]);

  // 시각화 인스턴스를 공유하기 위한 Ref
  const visualizerRef = useRef<any>(null);

  const { View, Settings } = module;

  // 모듈의 ID에서 베이스 ID(접미사 제외)를 추출하여 번역 키 생성 및 번역 적용
  const displayTitle = useMemo(() => {
    let baseId = module.id;
    const lastHyphenIndex = module.id.lastIndexOf('-');
    // ID가 'name-timestamp' 형식인 경우 timestamp 제거하여 원본 키(baseId) 획득
    if (lastHyphenIndex !== -1 && !isNaN(Number(module.id.substring(lastHyphenIndex + 1)))) {
      baseId = module.id.substring(0, lastHyphenIndex);
    }
    return t(`analysisTools.${baseId}`, module.title);
  }, [module.id, module.title, t, localesLoaded]);

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
        className="grid-item-overlay drag-handle frostedglassmorphism" 
        style={{ ...styles.header, ...((isHovered || isSettingsOpen) ? styles.headerVisible : {}) }}
      >
        <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#222' }}>{displayTitle}</span>
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
        <View 
          data={data}
          currentFrame={currentFrame} 
          settings={settings} 
          isSettingsOpen={isSettingsOpen}
        />

        {/* 설정 레이어 (우측 사이드 패널 형태) */}
        {isSettingsOpen && (
          <Div className="grid-item-overlay setting frostedglassmorphism side-panel" style={{
            ...styles.sidePanel
          }}>
            {/* data와 currentFrame을 Settings 컴포넌트에 전달 */}
            <Settings 
              settings={settings} 
              onSettingsChange={setSettings} 
              data={data}
            />
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
