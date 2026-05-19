import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Responsive } from 'react-grid-layout';
import { Div } from "@common/bridges/UIBridge";
import vars from '@/common/components/ui-brick/Variables';

import { AnalysisModule } from '@features/cv-val/types/analysis-module';
import AnalysisGridItem from './AnalysisGridItem';

interface Props {
  modules: AnalysisModule[];
  data: any;
  currentFrame: number;
  onRemoveModule: (id: string) => void;
}

const COLUMNS = { lg: 24, md: 20, sm: 12, xs: 8, xxs: 8 };

const AnalysisGridContainer: React.FC<Props> = ({ modules, data, currentFrame, onRemoveModule }) => {
  const [containerWidth, setContainerWidth] = useState(0);
  const [layouts, setLayouts] = useState<{ [key: string]: any[] }>({});
  const gridWrapperRef = useRef<HTMLDivElement>(null);

  const onLayoutChange = useCallback((currentLayout: any, allLayouts: any) => {
    setLayouts((prev) => {
      const isSame = JSON.stringify(prev) === JSON.stringify(allLayouts);
      if (isSame) return prev;
      return allLayouts;
    });
  }, []);

  // 렌더링 시점에 레이아웃을 보정하여 RGL에 전달 (작게 추가되는 현상 방지 핵심)
  const finalLayouts = React.useMemo(() => {
    const activeIds = modules.map(m => m.id);
    const nextLayouts: { [key: string]: any[] } = {};
    const breakpoints = Object.keys(COLUMNS) as Array<keyof typeof COLUMNS>;

    breakpoints.forEach((bp) => {
      // 1. 기존 레이아웃에서 현재 존재하는 모듈만 필터링
      const currentBpLayout = (layouts[bp] || []).filter(l => activeIds.includes(l.i));

      // 2. 레이아웃 정보가 없는 새로운 모듈에 대해 초기값 설정
      const existingIds = new Set(currentBpLayout.map(l => l.i));
      const missingModules = modules.filter(m => !existingIds.has(m.id));

      nextLayouts[bp] = [
        ...currentBpLayout,
        ...missingModules.map(m => {
          const w = Math.min(8, COLUMNS[bp]);
          const x = Math.max(0, Math.floor((COLUMNS[bp] - w) / 2));
          return {
            i: m.id,
            x,
            y: Infinity, // RGL이 빈 자리에 배치하도록 유도
            w,
            h: 18,
            minW: 6, // 최소 크기를 명시적으로 크게 설정
            minH: 12,
          };
        })
      ];
    });
    return nextLayouts;
  }, [layouts, modules]);

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

  return (
    <Div
      ref={gridWrapperRef}
      className="analysis-grid-container"
      style={
        {
          ...styles.container,
          width: '100%',
          flex: 1,
          position:
            'relative',
          overflowY: 'scroll'
        }}
    >
      {containerWidth > 0 && (
        <Responsive
          width={containerWidth}
          layouts={finalLayouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          onLayoutChange={onLayoutChange}
          cols={COLUMNS}
          rowHeight={10}
          dragConfig={{
            handle: '.drag-handle',
            cancel: '.no-drag',
          }}
          margin={[15, 15]}
        >
          {modules.map((module) => (
            <AnalysisGridItem
              key={module.id}
              module={module}
              data={data}
              currentFrame={currentFrame}
              onRemove={onRemoveModule}
            />
          ))}
        </Responsive>
      )}

      <style>{`
        .drag-handle { pointer-events: auto; cursor: grab; }
        .drag-handle:active { cursor: grabbing; }
        .react-grid-placeholder { border-radius: 12px !important; background: ${vars.primary} !important; opacity: 0.2 !important; }
        
        /* 리사이즈 핸들 스타일 및 가시성 확보 */
        .react-resizable-handle { 
          position: absolute; 
          width: 20px; 
          height: 20px; 
          bottom: 0; 
          right: 0; 
          cursor: se-resize; 
          z-index: 40 !important; 
        }
        /* 핸들 모양 표시 (삼각형 아이콘) */
        .react-resizable-handle::after { content: "◢"; position: absolute; right: 3px; bottom: 3px; color: ${vars.primary}; opacity: 0.5; font-size: 12px; }
      `}</style>
    </Div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: '100%',
    flex: 1,
    position: 'relative',
    overflowY: 'scroll',
  }
};

export default AnalysisGridContainer;
