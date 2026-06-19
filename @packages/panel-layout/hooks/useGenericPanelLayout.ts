import React, { useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { usePanelLayoutState } from './usePanelLayoutState';
import { usePanelRegistry } from './usePanelRegistry';
import { usePanelSizeManager } from './usePanelSizeManager';

/** 레이아웃 시스템 내부에서 아이템 관리를 위해 사용하는 래퍼 타입 */
export interface LayoutItem<T> {
  id: string;
  data: T;
}

/** 외부에서 레이아웃 내부의 상태를 조회하기 위한 핸들 */
export interface GenericPanelLayoutHandle<T> {
  getInternalId: (item: T) => string | undefined;
}

/** 저장소에 기록되는 직렬화된 레이아웃 행 정보 */
export interface SerializedPanelRow {
  id: string;
  width: number;
  height: number;
  tabs: string[];
}

/** 저장소에 기록되는 전체 레이아웃 정보 */
export interface SerializedPanelLayout {
  groups: SerializedPanelRow[][];
  activeTabMap: Record<string, string>;
  panelTypes: Record<string, string>;
}

/** 런타임에서 데이터(T)를 포함하는 레이아웃 구조 */
export interface PanelLayout<T> {
  groups: {
    id: string;
    width: number;
    height: number;
    tabs: LayoutItem<T>[];
  }[][];
  activeTabMap: Record<string, string>;
}

export interface UseGenericPanelLayoutProps<T> {
  items: T[];
  onRemoveItem?: (item: T, id: string) => void;
  onReorderItems?: (newItems: T[]) => void;
  layout?: SerializedPanelLayout;
  onLayoutChange?: (layoutJson: PanelLayout<T>) => void;
  onLayoutChangeEnd?: (layoutJson: PanelLayout<T>) => void;
  maxColumns?: number;
  maxRows?: number;
}

export function useGenericPanelLayout<T>(
  {
    items,
    onRemoveItem,
    onReorderItems,
    layout,
    onLayoutChange,
    onLayoutChangeEnd,
    maxColumns,
    maxRows,
  }: UseGenericPanelLayoutProps<T>,
  ref: React.ForwardedRef<GenericPanelLayoutHandle<T>>
) {
  const {
    wrappedItems,
    idRegistry,
    newlyAddedIdRef,
    prevItemsRef,
    handleRemoveItem: registryRemoveItem
  } = usePanelRegistry(items, onRemoveItem, onReorderItems);

  // 외부에서 객체 참조를 통해 내부 ID를 조회할 수 있도록 허용
  useImperativeHandle(ref, () => ({
    getInternalId: (item: T) => idRegistry.current.get(item)
  }));

  const handleReorder = useCallback((newWrappedItems: LayoutItem<T>[]) => {
    onReorderItems?.(newWrappedItems.map(w => w.data));
  }, [onReorderItems]);

  const state = usePanelLayoutState(wrappedItems, handleReorder, maxColumns, maxRows, layout);
  const { 
    groups, itemsMap, activeTabMap, setActiveTabMap, 
    lastInteractedItemId, onPanelDrop: originalOnPanelDrop, dropZone 
  } = state;

  const {
    colSizes, setColSizes,
    rowSizesMap, setRowSizesMap,
    onPanelDrop,
    updateFromLayout
  } = usePanelSizeManager(layout, groups, dropZone, originalOnPanelDrop);

  // [요구사항 1] 구조 변경 감지 (key 전환 및 균등 배분용)
  const lastStructureRef = useRef({ colCount: groups.length, rowCounts: groups.map(g => g.length) });
  const isColChanged = groups.length !== lastStructureRef.current.colCount;
  const isRowChanged = groups.some((g, i) => g.length !== (lastStructureRef.current.rowCounts[i] || 0));

  useEffect(() => {
    lastStructureRef.current = { colCount: groups.length, rowCounts: groups.map(g => g.length) };
  }, [groups]);

  // [동기 포커싱] 렌더링 도중 발견된 신규 ID를 hook에서 반환한 ref에 즉시 주입
  if (newlyAddedIdRef.current) {
    lastInteractedItemId.current = newlyAddedIdRef.current;
    newlyAddedIdRef.current = null;
  }

  useEffect(() => {
    prevItemsRef.current = items;
  }, [items]);

  const getItemByInternalId = useCallback((id: string) => itemsMap[id]?.data, [itemsMap]);

  // Layout Sync 및 구조 감지 업데이트
  const lastLayoutRef = useRef(layout);
  if (layout !== lastLayoutRef.current) {
    lastLayoutRef.current = layout;
    // 복구 시에는 구조 변경 감지용 Ref를 즉시 업데이트하여 'isColChanged'가 true가 되는 것을 방지
    if (layout?.groups) {
      lastStructureRef.current = {
        colCount: layout.groups.length,
        rowCounts: layout.groups.map(g => g.length)
      };
    }
  }

  const getFullLayout = useCallback((): PanelLayout<T> => {
    return {
      groups: groups.map((col, cIdx) => col.map((row) => ({
        ...row,
        width: colSizes[`col-${cIdx}`] ?? (100 / groups.length),
        height: rowSizesMap[cIdx]?.[row.id] ?? (100 / col.length),
        tabs: row.tabs.map(id => itemsMap[id]).filter(Boolean)
      }))),
      activeTabMap
    };
  }, [groups, colSizes, rowSizesMap, activeTabMap, itemsMap]);

  useEffect(() => {
    onLayoutChange?.(getFullLayout());
  }, [getFullLayout, onLayoutChange]);

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
  }, [groups, activeTabMap, onLayoutChangeEnd, getFullLayout]);

  const handleResizeEnd = useCallback(() => {
    onLayoutChangeEnd?.(getFullLayout());
  }, [getFullLayout, onLayoutChangeEnd]);

  const handleRemoveItem = useCallback((id: string, rowId: string, tabIds: string[]) => {
    registryRemoveItem(id, rowId, tabIds, activeTabMap, setActiveTabMap, getItemByInternalId);
  }, [registryRemoveItem, activeTabMap, setActiveTabMap, getItemByInternalId]);

  return {
    ...state,
    onPanelDrop,
    colSizes,
    setColSizes,
    rowSizesMap,
    setRowSizesMap,
    isColChanged,
    isRowChanged,
    lastStructureRef,
    handleResizeEnd,
    handleRemoveItem,
  };
}