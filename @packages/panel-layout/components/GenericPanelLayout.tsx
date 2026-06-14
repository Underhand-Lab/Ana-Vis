import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Panel, Group, Layout } from 'react-resizable-panels';
import { Div, vars } from "@shared/bridges/UIBridge";
import { usePanelLayoutState } from '../hooks/usePanelLayoutState';
import { PanelGroup } from './PanelGroup';
import { ResizeHandle } from './ResizeHandle';

interface GenericPanelLayoutProps<T extends { id: string }> {
  items: T[];
  renderItem: (
    item: T,
    handlers: { onDragStart: () => void; onDragEnd: () => void }
  ) => React.ReactNode;
  renderTabLabel?: (item: T, isActive: boolean) => React.ReactNode;
  onRemoveItem: (id: string) => void;
  onReorderItems?: (newItems: T[]) => void;
  onAddItem?: () => Promise<T | undefined>;
  emptyPlaceholder?: React.ReactNode;
  labels?: {
    toVertical: string;
    toHorizontal: string;
  };
  maxColumns?: number;
  maxRows?: number;
  /** 주입할 레이아웃 데이터 (JSON) */
  layout?: any;
  /** 실시간 레이아웃 변경 콜백 (리사이징 중 호출) */
  onLayoutChange?: (layoutJson: any) => void;
  /** 레이아웃이나 패널 상태 변경이 완료되었을 때 호출되는 콜백 (저장용) */
  onLayoutChangeEnd?: (layoutJson: any) => void;
}

export function GenericPanelLayout<T extends { id: string }>({
  items,
  renderItem,
  onRemoveItem,
  onReorderItems,
  onAddItem,
  emptyPlaceholder,
  renderTabLabel,
  maxColumns,
  maxRows,
  layout,
  onLayoutChange,
  onLayoutChangeEnd,
}: GenericPanelLayoutProps<T>) {
  const {
    groups,
    itemsMap,
    activeTabMap,
    setActiveTabMap,
    dragOverPos,
    dropZone,
    pendingAddTargetRef,
    pendingInsertTargetRef,
    lastInteractedItemId,
    onPanelDragOver,
    onPanelDrop,
    onPanelDragLeave,
    handleDragEnd,
    setDraggedPos
  } = usePanelLayoutState(items, onReorderItems, maxColumns, maxRows, layout);
  
  // 레이아웃의 가로(컬럼 너비), 세로(행 높이) 비율을 추적하기 위한 상태 (Layout 객체 사용)
  const [colSizes, setColSizes] = useState<Layout>({});
  const [rowSizesMap, setRowSizesMap] = useState<Record<number, Layout>>({});

  // 레이아웃 정보가 주입될 때(새로고침 등) 저장된 크기 정보로 초기화
  useEffect(() => {
    if (layout?.groups && Array.isArray(layout.groups)) {
      // 각 컬럼의 너비 정보 추출 (ID 기반 객체로 변환)
      const initialColSizes: Layout = {};
      layout.groups.forEach((col: any, cIdx: number) => {
        if (col[0]?.width !== undefined) initialColSizes[`col-${cIdx}`] = col[0].width;
      });
      setColSizes(initialColSizes);

      // 각 행의 높이 정보 추출
      const initialRowSizesMap: Record<number, Layout> = {};
      layout.groups.forEach((col: any, cIdx: number) => {
        const rowLayout: Layout = {};
        col.forEach((row: any) => {
          if (row.height !== undefined) rowLayout[row.id] = row.height;
        });
        initialRowSizesMap[cIdx] = rowLayout;
      });
      setRowSizesMap(initialRowSizesMap);
    }
  }, [layout]);

  // 현재 전체 레이아웃 상태(구조 + 크기 + 탭)를 구성하는 헬퍼 함수
  const getFullLayout = useCallback(() => {
    return {
      groups: groups.map((col, cIdx) => col.map((row, rIdx) => ({
        ...row,
        width: colSizes[`col-${cIdx}`] ?? (100 / groups.length),
        height: rowSizesMap[cIdx]?.[row.id] ?? (100 / col.length),
        tabs: row.tabs.map(id => itemsMap[id]).filter(Boolean)
      }))),
      activeTabMap
    };
  }, [groups, colSizes, rowSizesMap, activeTabMap, itemsMap]);

  // [실시간] 레이아웃 변경 콜백 (리사이징 도중 UI 동기화용)
  useEffect(() => {
    onLayoutChange?.(getFullLayout());
  }, [getFullLayout, onLayoutChange]);

  // [저장용] 구조적 변경 감지 (아이템 추가/삭제/이동, 탭 전환 시에만 실행)
  const lastSavedStructureRef = useRef('');
  useEffect(() => {
    // ID와 탭 구성 등 구조적인 정보만 추출하여 변경 여부 확인 (리사이징 정보 제외)
    const currentStructure = JSON.stringify({
      groups: groups.map(col => col.map(row => ({ id: row.id, tabs: row.tabs }))),
      activeTabMap
    });

    if (currentStructure !== lastSavedStructureRef.current) {
      lastSavedStructureRef.current = currentStructure;
      onLayoutChangeEnd?.(getFullLayout());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, activeTabMap, onLayoutChangeEnd]);

  // 리사이징이 완전히 끝났을 때(핸들을 뗐을 때) 호출될 핸들러
  const handleResizeEnd = useCallback(() => {
    onLayoutChangeEnd?.(getFullLayout());
  }, [getFullLayout, onLayoutChangeEnd]);

  return (
    <Div className="generic-panel-container" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', position: 'relative', backgroundColor: vars.background, boxSizing: 'border-box' }}>
      <Group 
        orientation="horizontal" 
        style={{ flex: 1 }} 
        onLayoutChange={setColSizes}
      >
        {groups.flatMap((column, cIdx) => {
          const colElements: React.ReactNode[] = [
            <Panel 
              key={`col-${cIdx}`} 
              id={`col-${cIdx}`} 
              defaultSize={colSizes[`col-${cIdx}`] ?? (100 / groups.length)} 
              minSize={20}
            >
              <Group 
                orientation="vertical" 
                onLayoutChange={(sizes: Layout) => setRowSizesMap(prev => ({ ...prev, [cIdx]: sizes }))}
              >
                {column.flatMap((row, rIdx) => {
                  const rowElements: React.ReactNode[] = [
                    <Panel 
                      key={row.id} 
                      id={row.id} 
                      defaultSize={rowSizesMap[cIdx]?.[row.id] ?? (100 / column.length)} 
                      minSize={15}
                    >
                      <PanelGroup
                        cIdx={cIdx} rIdx={rIdx} group={row.tabs} itemsMap={itemsMap}
                        activeTabId={activeTabMap[row.id]}
                        onSelectTab={(id) => setActiveTabMap(prev => ({ ...prev, [row.id]: id }))}
                        onRemoveItem={onRemoveItem}
                        renderTabLabel={renderTabLabel}
                        onAddItem={onAddItem ? async () => {
                          const targetId = activeTabMap[row.id];
                          pendingAddTargetRef.current = targetId;
                          pendingInsertTargetRef.current = { targetRowId: row.id, targetTabId: targetId };
                          const newItem = await onAddItem();
                          if (newItem) {
                            lastInteractedItemId.current = newItem.id;
                          }
                        } : undefined}
                        renderItem={renderItem}
                        dragOverPos={dragOverPos} dropZone={dropZone}
                        onPanelDragOver={onPanelDragOver} onPanelDrop={onPanelDrop}
                        onPanelDragLeave={onPanelDragLeave}
                        onTabDragStart={(iIdx) => setDraggedPos({ cIdx, rIdx, iIdx })}
                        onDragEnd={handleDragEnd}
                      />
                    </Panel>
                  ];
                  if (rIdx < column.length - 1) {
                    rowElements.push(
                      <ResizeHandle 
                        key={`sep-row-${row.id}`} 
                        direction="horizontal" 
                        onDraggingChange={(isDragging) => !isDragging && handleResizeEnd()}
                      />
                    );
                  }
                  return rowElements;
                })}
              </Group>
            </Panel>
          ];
          if (cIdx < groups.length - 1) {
            colElements.push(
              <ResizeHandle 
                key={`sep-col-${cIdx}`} 
                direction="vertical" 
                onDraggingChange={(isDragging) => !isDragging && handleResizeEnd()}
              />
            );
          }
          return colElements;
        })}
      </Group>
    </Div>
  );
}