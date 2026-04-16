import React, { useState, forwardRef, useRef } from 'react';
import { AnalysisModule } from '../types/analysis';

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

const NewAnalysisGridItem = forwardRef<HTMLDivElement, Props>((props, ref) => {
  const { 
    module, data, currentFrame, onRemove,
    style, className, onMouseDown, onMouseUp, onTouchEnd, children 
  } = props;

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState(module.defaultSettings);

  // 시각화 인스턴스를 공유하기 위한 Ref
  const visualizerRef = useRef<any>(null);

  const { View, Settings, title } = module;
  const toggleSettings = () => setIsSettingsOpen((prev) => !prev);

  return (
    <div 
      ref={ref}
      style={{ ...style, border: '1px solid #ddd', overflow: 'hidden' }}
      className={`${className} analysis-grid-item grid-item-card ${isSettingsOpen ? 'isSetting' : ''}`}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onTouchEnd={onTouchEnd}
    >
      {/* 상단 드래그 핸들 오버레이 */}
      <div className="grid-item-overlay drag-handle frostedglassmorphism" style={{ 
        position: 'absolute', top: 0, left: 0, right: 0, height: '40px', 
        zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 15px'
      }}>
        <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{title}</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={(e) => { e.stopPropagation(); toggleSettings(); }} 
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'white', fontSize: '16px' }}
          >
            ⚙️
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onRemove(module.id); }} 
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'black', fontSize: '16px' }}
          >
            ✕
          </button>
        </div>
      </div>

      <div className="item-content no-drag" style={{ width: '100%', height: '100%', position: 'relative' }}>
        {/* 실제 시각화 결과물 */}
        <View 
          data={data} 
          moduleId={module.id}
          currentFrame={currentFrame} 
          settings={settings} 
          isSettingsOpen={isSettingsOpen} 
          visualizerRef={visualizerRef}
        />

        {/* 설정 레이어 (우측 사이드 패널 형태) */}
        {isSettingsOpen && (
          <div className="grid-item-overlay setting frostedglassmorphism side-panel" style={{
            position: 'absolute',
            top: '40px', // 핸들 아래부터 시작
            right: 0,
            bottom: 0,
            padding: '20px',
            zIndex: 20,
            overflowY: 'auto',
            borderLeft: '1px solid rgba(255,255,255,0.3)'
          }}>
            {/* data와 currentFrame을 Settings 컴포넌트에 전달 */}
            <Settings 
              settings={settings} 
              onSettingsChange={setSettings} 
              data={data} 
              currentFrame={currentFrame} 
              moduleId={module.id}
              visualizer={visualizerRef.current}
            />
          </div>
        )}
      </div>

      {/* RGL 리사이즈 핸들을 위한 children */}
      {children}
    </div>
  );
});

NewAnalysisGridItem.displayName = 'NewAnalysisGridItem';

export default NewAnalysisGridItem;
