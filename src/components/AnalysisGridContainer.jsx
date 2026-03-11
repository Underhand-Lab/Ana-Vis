import React, { useState, useEffect, useImperativeHandle, forwardRef, useRef } from 'react';
import { Responsive } from 'react-grid-layout';
import AnalysisGridItem from './AnalysisGridItem';

// CSS 경로는 프로젝트 환경에 따라 'react-grid-layout/css/styles.css'로 수정 가능
import '/node_modules/react-grid-layout/css/styles.css';
import '/node_modules/react-resizable/css/styles.css';

const AnalysisContainer = forwardRef(({ data, toolConfigs, defaultTools, onUpdate, currentIdx = 0 }, ref) => {
  const [frames, setFrames] = useState([]);
  const [layout, setLayout] = useState([]);
  const [containerWidth, setContainerWidth] = useState(0);
  const gridWrapperRef = useRef(null);

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

    const id = `${type}-${Date.now()}`;
    const fm = config.Component ? null : config.create?.();
    const itemWidth = 8;
    const centerX = Math.max(0, Math.floor((COLUMNS.lg / 2) - (itemWidth / 2)));

    setFrames(prev => [...prev, { id, type, config, fm, Component: config.Component, isPinned: false }]);
    setLayout(prev => [...prev, { i: id, x: centerX, y: Infinity, w: itemWidth, h: 18, minW: 4, minH: 10 }]);
  };

  const togglePin = (id) => {
    //setFrames(prev => prev.map(f => f.id === id ? { ...f, isPinned: !f.isPinned } : f));
  };

  const removeFrame = (id) => {
    setFrames(prev => prev.filter(f => f.id !== id));
    setLayout(prev => prev.filter(l => l.i !== id));
  };

  useEffect(() => {
    if (defaultTools && frames.length === 0) {
      defaultTools.forEach((type) => addNewFrame(type));
    }
  }, [defaultTools, toolConfigs]);

  return (
    <div ref={gridWrapperRef} style={{ width: '100%', flex: 1, }}>
      {containerWidth > 0 && (
        <Responsive
          width={containerWidth}
          layouts={{ lg: layout, md: layout, sm: layout, xs: layout, xxs: layout }}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={COLUMNS}
          rowHeight={10}
          dragConfig={{
            handle: '.drag-handle',    // 'draggableHandle' 대신 'handle'일 가능성이 큼
            cancel: '.no-drag',        // 'draggableCancel' 대신 'cancel'
            // 만약 위가 안된다면 아래처럼 시도해보세요.
            // draggableHandle: '.drag-handle',
          }}
          onLayoutChange={(newLayout) => setLayout(newLayout)}
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
        .react-resizable-handle { z-index: 20 !important; }
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