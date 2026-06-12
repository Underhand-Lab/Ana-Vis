import React, { useEffect } from 'react';
import { Panel, Group } from 'react-resizable-panels';
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
  /** 레이아웃이나 패널 상태가 변경될 때 호출되는 콜백 (JSON 반환) */
  onLayoutChange?: (layoutJson: any) => void;
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

  // 레이아웃 정보(구조, 활성 탭 등)를 객체 형태로 추출하여 콜백 실행
  useEffect(() => {
    if (onLayoutChange) {
      // id 대신 실제 아이템(T) 객체를 tabs 배열에 담아 반환
      const layoutWithItems = {
        groups: groups.map(col => col.map(row => ({
          ...row,
          tabs: row.tabs.map(id => itemsMap[id]).filter(Boolean)
        }))),
        activeTabMap
      };
      
      onLayoutChange(layoutWithItems);
    }
  }, [groups, activeTabMap, itemsMap, onLayoutChange]);


  return (
    <Div className="generic-panel-container" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', position: 'relative', backgroundColor: vars.background, boxSizing: 'border-box' }}>
      <Group orientation="horizontal" style={{ flex: 1 }}>
        {groups.flatMap((column, cIdx) => {
          const colElements: React.ReactNode[] = [
            <Panel key={`col-${cIdx}`} id={`col-${cIdx}`} defaultSize={100 / groups.length} minSize={20}>
              <Group orientation="vertical">
                {column.flatMap((row, rIdx) => {
                  const rowElements: React.ReactNode[] = [
                    <Panel key={row.id} id={row.id} defaultSize={100 / column.length} minSize={15}>
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
                      <ResizeHandle key={`sep-row-${row.id}`} direction="horizontal" />
                    );
                  }
                  return rowElements;
                })}
              </Group>
            </Panel>
          ];
          if (cIdx < groups.length - 1) {
            colElements.push(
              <ResizeHandle key={`sep-col-${cIdx}`} direction="vertical" />
            );
          }
          return colElements;
        })}
      </Group>
    </Div>
  );
}