import React, { forwardRef, useEffect, useRef } from 'react';

const AnalysisGridItem = forwardRef(({
  // RGL(React-Grid-Layout)에서 주입하는 필수 Props
  style, className, onMouseDown, onMouseUp, onTouchEnd, children,
  // 사용자 정의 Props
  id, type, config, fm, isPinned, onTogglePin, onRemove,
  Component, data, currentIdx, HtmlLoader
}, ref) => {
  const itemRef = useRef(null);

  // 리사이즈 감지 및 캔버스 업데이트 (기존 로직 유지)
  useEffect(() => {
    if (!itemRef.current || !fm || !fm.renderer) return;

    const observer = new ResizeObserver(() => {
      const rawImages = data?.getRawImgList?.(0);
      const source = rawImages ? rawImages[currentIdx] : null;

      if (source) {
        fm.renderer.updateLayout(source.width, source.height);
        fm.drawImageAt?.(currentIdx);
      }
    });

    observer.observe(itemRef.current);
    return () => observer.disconnect();
  }, [fm, data, currentIdx]);

  return (
    <div
      // 1. RGL이 이 요소를 제어할 수 있도록 ref 연결
      ref={(node) => {
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
        itemRef.current = node;
      }}
      // 2. RGL이 계산한 좌표/크기(style)와 클래스 바인딩
      style={{ ...style }}
      className={`${className} grid-item-card neumorphism-group ${isPinned ? 'pinned' : ''}`}
      // 3. 드래그/리사이즈 시작 이벤트 연결
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onTouchEnd={onTouchEnd}
    >
      {/* 콘텐츠 영역 */}
      <div className="grid-item-content" style={{ width: '100%', height: '100%', position: 'relative' }}>
        {Component ? (
          <Component data={data} idx={currentIdx} />
        ) : (
          <HtmlLoader config={config} fm={fm} data={data} idx={currentIdx} />
        )}
      </div>

      {/* 오버레이 (디자인 수정 없음) */}
      <div className="grid-item-overlay drag-handle" style={{ right: 0 }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button 
            onClick={(e) => { e.stopPropagation(); onTogglePin(id); }} 
            style={iconBtnStyle}
          >
            {isPinned ? '📍' : '🔓'}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onRemove(id); }} 
            style={iconBtnStyle}
          >
            ✕
          </button>
        </div>
      </div>
      
      {/* RGL 리사이즈 핸들이 자식 요소로 들어올 때를 위한 공간 (children) */}
      {children}
    </div>
  );
});

const iconBtnStyle = { border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px', padding: '2px 5px', color: 'black' };

export default AnalysisGridItem;