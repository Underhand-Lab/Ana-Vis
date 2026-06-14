import React from 'react';
import { vars } from "@shared/bridges/UIBridge";
import { PanelGroup } from './PanelGroup';
import { PanelItemLifecycleWrapper } from './PanelItemLifecycleWrapper';
import { GenericPanelLayoutProps } from './GenericPanelLayout';
import { useGenericPanelLayout } from '../hooks/useGenericPanelLayout';

interface GenericPanelRowContentProps<T> {
  cIdx: number;
  rIdx: number;
  row: { id: string; tabs: string[] };
  layout: ReturnType<typeof useGenericPanelLayout<T>>;
  externalProps: GenericPanelLayoutProps<T>;
}

/** 
 * 개별 패널(로우)의 내부 콘텐츠(탭 그룹 및 라이프사이클)를 담당하는 컴포넌트 
 */
export function GenericPanelRowContent<T>({
  cIdx,
  rIdx,
  row,
  layout,
  externalProps,
}: GenericPanelRowContentProps<T>) {
  const { 
    itemsMap, activeTabMap, setActiveTabMap, handleRemoveItem, 
    pendingAddTargetRef, pendingInsertTargetRef, dragOverPos, dropZone, 
    onPanelDragOver, onPanelDrop, onPanelDragLeave, setDraggedPos, handleDragEnd 
  } = layout;

  const { 
    renderTabLabel, onAddItem, onItemInit, onItemCleanup, getItemDeps, renderItem 
  } = externalProps;

  return (
    <PanelGroup
      cIdx={cIdx} rIdx={rIdx} group={row.tabs} itemsMap={itemsMap}
      activeTabId={activeTabMap[row.id]}
      onSelectTab={(id) => setActiveTabMap(prev => ({ ...prev, [row.id]: id }))}
      onRemoveItem={(id) => handleRemoveItem(id, row.id, row.tabs)}
      renderTabLabel={(wrapped, isActive) => {
        if (renderTabLabel) return renderTabLabel(wrapped.data, isActive, wrapped.id);
        const data = wrapped.data as any;
        return (
          <span style={{ fontSize: '12px', color: vars.text, fontWeight: isActive ? 'bold' : 'normal' }}>
            {data.title ?? data.name ?? wrapped.id}
          </span>
        );
      }}
      onAddItem={onAddItem ? async () => {
        const targetId = activeTabMap[row.id];
        pendingAddTargetRef.current = targetId;
        pendingInsertTargetRef.current = { targetRowId: row.id, targetTabId: targetId };
        await onAddItem();
      } : undefined}
      renderItem={(wrapped, handlers) => (
        <PanelItemLifecycleWrapper
          item={wrapped.data}
          id={wrapped.id}
          onInit={onItemInit}
          onCleanup={onItemCleanup}
          deps={getItemDeps?.(wrapped.data, wrapped.id)}
        >
          {renderItem(wrapped.data, wrapped.id, handlers)}
        </PanelItemLifecycleWrapper>
      )}
      dragOverPos={dragOverPos}
      dropZone={dropZone}
      onPanelDragOver={onPanelDragOver}
      onPanelDrop={onPanelDrop}
      onPanelDragLeave={onPanelDragLeave}
      onTabDragStart={(iIdx) => setDraggedPos({ cIdx, rIdx, iIdx })}
      onDragEnd={handleDragEnd}
    />
  );
}