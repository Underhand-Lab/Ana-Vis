import React from 'react';
import { Panel, Group } from 'react-resizable-panels';
import { Div, vars } from "@shared/bridges/UIBridge";
import { usePanelLayoutState } from '../hooks/usePanelLayoutState';
import { PanelGroup as PanelItemContainer } from './PanelGroup';
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
  } = usePanelLayoutState(items, onReorderItems, maxColumns, maxRows);

  if (items.length === 0) {
    return <>{emptyPlaceholder}</>;
  }

  return (
    <Div className="generic-panel-container" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', position: 'relative', backgroundColor: vars.background }}>
      <Group orientation="horizontal" style={{ flex: 1 }}>
        {groups.flatMap((column, cIdx) => {
          const colElements: React.ReactNode[] = [
            <Panel key={`col-${cIdx}`} id={`col-${cIdx}`} defaultSize={100 / groups.length} minSize={20}>
              <Group orientation="vertical">
                {column.flatMap((row, rIdx) => {
                  const rowElements: React.ReactNode[] = [
                    <Panel key={row.id} id={row.id} defaultSize={100 / column.length} minSize={15}>
                      <PanelItemContainer
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