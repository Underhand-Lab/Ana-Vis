import React, { useState, useEffect, useImperativeHandle, forwardRef, useRef } from 'react';
import { Responsive } from 'react-grid-layout';
import AnalysisGridItem from './AnalysisGridItem';

// CSS 경로는 프로젝트 환경에 따라 'react-grid-layout/css/styles.css'로 수정 가능
import '/node_modules/react-grid-layout/css/styles.css';
import '/node_modules/react-resizable/css/styles.css';

const AnalysisContainer = forwardRef(({ data, toolConfigs, defaultTools, onUpdate, currentIdx = 0 }, ref) => {
  const [frames, setFrames] = useState([]);
  const [layouts, setLayouts] = useState({ lg: [], md: [], sm: [], xs: [], xxs: [] });
  const [containerWidth, setContainerWidth] = useState(0);
  const gridWrapperRef = useRef(null);
  const isInitialized = useRef(false);

  const COLUMNS = { lg: 24, md: 20, sm: 12, xs: 8, xxs: 8 };

  useEffect(() => {
    if (!gridWrapperRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        if (entry.contentRect.width > 0) setContainerWidth(entry.contentRect.width);
      }
    });
    resizeObserver.observe(gridWrapperRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useImperativeHandle(ref, () => ({
    addTool: (type) => addNewFrame(type),
    updateImage: () => {
      
    }
  }));

  const addNewFrame = (type) => {
    const config = toolConfigs[type];
    if (!config) return;

    // 고유한 ID 생성을 위해 랜덤 값 추가 (중복 키 방지)
    const id = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const fm = config.Component ? null : config.create?.();
    const itemWidth = 8;
    const centerX = 0;

    setFrames(prev => [...prev, { id, type, config, fm, Component: config.Component, isPinned: false }]);
    
    // 모든 breakpoint의 레이아웃에 새 아이템 추가하여 초기 렌더링 시 레이아웃 깨짐 방지
    setLayouts(prev => {
      const nextLayouts = { ...prev };
      Object.keys(COLUMNS).forEach(bp => {
        nextLayouts[bp] = [...(nextLayouts[bp] || []), { i: id, x: centerX, y: Infinity, w: itemWidth, h: 18, minW: 4, minH: 10 }];
      });
      return nextLayouts;
    });
  };

  const togglePin = (id) => {
    //setFrames(prev => prev.map(f => f.id === id ? { ...f, isPinned: !f.isPinned } : f));
  };

  const removeFrame = (id) => {
    setFrames(prev => prev.filter(f => f.id !== id));
    
    // 모든 중단점 레이아웃에서 해당 아이템 삭제
    setLayouts(prev => {
      const nextLayouts = { ...prev };
      Object.keys(nextLayouts).forEach(bp => {
        nextLayouts[bp] = (nextLayouts[bp] || []).filter(l => l.i !== id);
      });
      return nextLayouts;
    });
  };

  useEffect(() => {
    // 초기화가 이미 진행되었거나 데이터가 없는 경우 방지
    if (!isInitialized.current && defaultTools && toolConfigs) {
      isInitialized.current = true;
      defaultTools.forEach((type) => addNewFrame(type));
    }
  }, [defaultTools, toolConfigs]); // frames.length 의존성 제거

  return (
    <div ref={gridWrapperRef} style={{ width: '100%', flex: 1, }}>
      {containerWidth > 0 && (
        <Responsive
          width={containerWidth}
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={COLUMNS}
          rowHeight={10}
          dragConfig={{
            handle: '.drag-handle',    // 'draggableHandle' 대신 'handle'일 가능성이 큼
            cancel: '.no-drag',        // 'draggableCancel' 대신 'cancel'
            // 만약 위가 안된다면 아래처럼 시도해보세요.
            // draggableHandle: '.drag-handle',
          }}
          onLayoutChange={(current, all) => {
            // 실제 데이터가 변경되었을 때만 상태를 업데이트하여 무한 루프 방지
            setLayouts(prev => {
              return JSON.stringify(prev) === JSON.stringify(all) ? prev : all;
            });
          }}
          margin={[15, 15]}
          compactType="vertical"
          resizeConfig={{
            enabled: true,
            handles: ['sw', 'se']
          }}
        >
          {frames.map((frame) => (
            <AnalysisGridItem
              key={frame.id}
              {...frame}
              data={data}
              currentIdx={currentIdx}
              onTogglePin={togglePin}
              onRemove={removeFrame}
              HtmlLoader={HtmlLoader}
            />
          ))}
        </Responsive>
      )}

      <style>{`
        .grid-item-overlay { opacity: 0; pointer-events: none; position: absolute; transition: opacity 0.2s; z-index: 10; }
        .drag-handle { pointer-events: auto; }
        .grid-item-overlay.drag-handle:hover { opacity: 1; pointer-events: auto; }
        .grid-item-card.pinned .grid-item-overlay, 
        .grid-item-card.isSetting .grid-item-overlay { opacity: 1; pointer-events: auto; }
        .grid-item-card { overflow: hidden; display: flex; flex-direction: column; background: white; border-radius: 12px; border: 1px solid transparent; transition: border-color 0.2s; position: relative; }
        .grid-item-card:hover { border-color: #d1d9e6; }
        .grid-item-card.isSetting .setting {opacity: 1;}
        .react-resizable-handle { z-index: 20 !important; color: white; }
      `}</style>
    </div>
  );
});

const HtmlLoader = ({ config, fm, data, idx }) => {
  const containerRef = useRef(null);
  const isLoaded = useRef(false);

  useEffect(() => {
    if (!config.src) return;
    fetch(config.src).then(res => res.text()).then(text => {
      if (!containerRef.current || isLoaded.current) return;
      containerRef.current.innerHTML = text;
      isLoaded.current = true;
      if (fm) {
        fm.bindUI(containerRef.current);
        config.bindUI?.(containerRef.current, fm);
      }
    });
  }, [config, fm]);

  useEffect(() => {
    if (isLoaded.current && fm && data) {
      console.log(data);
      fm.setData?.(data);
      fm.drawImageAt?.(idx);
    }
  }, [data, idx, fm]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};

export default AnalysisContainer;