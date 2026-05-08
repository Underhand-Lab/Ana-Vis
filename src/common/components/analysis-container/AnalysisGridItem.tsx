import React, { useState, forwardRef, useRef } from 'react';
import { AnalysisModule } from '../../types/analysis-module';
import { Div } from "../../bridges/UIBridge";
import vars from '../ui/Variables';

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

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [settings, setSettings] = useState(module.defaultSettings);

  // 시각화 인스턴스를 공유하기 위한 Ref
  const visualizerRef = useRef<any>(null);

  const { View, Settings, title } = module;
  const toggleSettings = () => setIsSettingsOpen((prev) => !prev);

  return (
    <Div 
      ref={ref}
      style={{ ...styles.card, ...style }}
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
        <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{title}</span>
        <Div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={(e) => { e.stopPropagation(); toggleSettings(); }} 
            style={styles.iconButton}
          >
            ⚙️
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onRemove(module.id); }} 
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'black', fontSize: '16px' }}
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
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
    overflow: 'hidden',
    fontFamily: vars.font,
    border: '1px solid #ddd',
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
  }
};

AnalysisGridItem.displayName = 'NewAnalysisGridItem';
export default AnalysisGridItem;
