import React, { useEffect, useState, useCallback, useMemo, useRef, useImperativeHandle } from 'react';
import { Layout } from 'react-resizable-panels';
import { usePanelLayoutState } from './usePanelLayoutState';

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
  // 도메인 객체와 내부 ID 간의 맵핑을 유지하기 위한 레지스트리
  const idRegistry = useRef(new Map<T, string>());

  // 도메인 데이터 T를 내부 관리용 ID를 가진 LayoutItem<T>로 래핑합니다.
  const prevItemsRef = useRef<T[]>([]);
  const newlyAddedIdRef = useRef<string | null>(null);

  const wrappedItems = useMemo((): LayoutItem<T>[] => {
    const result = items.map(item => {
      let id = idRegistry.current.get(item);
      if (!id) {
        // 1. 객체 내부에 id가 있다면 재사용(Persistence 목적), 없다면 새로 생성
        id = String((item as any).id || (item as any).uuid || Math.random().toString(36).substring(2, 11));
        idRegistry.current.set(item, id);

        // 신규 추가된 아이템인 경우 ID 기록 (초기 렌더링 제외)
        if (prevItemsRef.current.length > 0 && !prevItemsRef.current.includes(item)) {
          newlyAddedIdRef.current = id;
        }
      }
      return { id, data: item };
    });
    return result;
  }, [items]);

  // 외부에서 객체 참조를 통해 내부 ID를 조회할 수 있도록 허용
  useImperativeHandle(ref, () => ({
    getInternalId: (item: T) => idRegistry.current.get(item)
  }));

  // 순서 변경 시 다시 도메인 데이터 리스트로 변환하여 부모에게 전달합니다.
  const handleReorder = useCallback((newWrappedItems: LayoutItem<T>[]) => {
    onReorderItems?.(newWrappedItems.map(w => w.data));
  }, [onReorderItems]);

  const state = usePanelLayoutState(wrappedItems, handleReorder, maxColumns, maxRows, layout);
  const { groups, itemsMap, activeTabMap, setActiveTabMap, lastInteractedItemId } = state;

  // [요구사항 1] 구조 변경 감지 (key 전환 및 균등 배분용)
  const lastStructureRef = useRef({ colCount: groups.length, rowCounts: groups.map(g => g.length) });
  const isColChanged = groups.length !== lastStructureRef.current.colCount;

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

  const extractSizes = (layoutObj: SerializedPanelLayout | undefined) => {
    const colSizes: Layout = {};
    const rowSizesMap: Record<number, Layout> = {};
    if (layoutObj?.groups) {
      layoutObj.groups.forEach((col, cIdx) => {
        if (col[0]?.width !== undefined) colSizes[`col-${cIdx}`] = col[0].width;
        const rowLayout: Layout = {};
        col.forEach((row) => {
          if (row.height !== undefined) rowLayout[row.id] = row.height;
        });
        rowSizesMap[cIdx] = rowLayout;
      });
    }
    return { colSizes, rowSizesMap };
  };

  const [colSizes, setColSizes] = useState<Layout>(() => extractSizes(layout).colSizes);
  const [rowSizesMap, setRowSizesMap] = useState<Record<number, Layout>>(() => extractSizes(layout).rowSizesMap);

  // Prop Sync: layout 프롭이 변경되면 렌더링 도중 즉시 상태 동기화 (useEffect 지연 방지)
  const [lastInjectedLayout, setLastInjectedLayout] = useState<SerializedPanelLayout | undefined>(layout);
  if (layout !== lastInjectedLayout) {
    setLastInjectedLayout(layout);
    const { colSizes: newCols, rowSizesMap: newRows } = extractSizes(layout);
    setColSizes(newCols);
    setRowSizesMap(newRows);
    
    // 복구 시에는 구조 변경 감지용 Ref를 즉시 업데이트하여 'isColChanged'가 true가 되는 것을 방지
    if (layout?.groups) {
      lastStructureRef.current = {
        colCount: layout.groups.length,
        rowCounts: layout.groups.map(g => g.length)
      };
    }
  }

  // 레이아웃 정보가 주입될 때(새로고침 등) 저장된 크기 정보로 초기화
  useEffect(() => {
    if (layout && layout.groups && Array.isArray(layout.groups)) {
      // 각 컬럼의 너비 정보 추출 (ID 기반 객체로 변환)
      const initialColSizes: Layout = {};
      layout.groups.forEach((col, cIdx) => {
        if (col[0]?.width !== undefined) initialColSizes[`col-${cIdx}`] = col[0].width;
      });
      setColSizes(initialColSizes);

      // 각 행의 높이 정보 추출
      const initialRowSizesMap: Record<number, Layout> = {};
      layout.groups.forEach((col, cIdx) => {
        const rowLayout: Layout = {};
        col.forEach((row) => {
          if (row.height !== undefined) rowLayout[row.id] = row.height;
        });
        initialRowSizesMap[cIdx] = rowLayout;
      });
      setRowSizesMap(initialRowSizesMap);
    }
  }, [layout]);

  // 현재 전체 레이아웃 상태(구조 + 크기 + 탭)를 구성하는 헬퍼 함수
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
  }, [groups, activeTabMap, onLayoutChangeEnd, getFullLayout]);

  // 리사이징이 완전히 끝났을 때(핸들을 뗐을 때) 호출될 핸들러
  const handleResizeEnd = useCallback(() => {
    onLayoutChangeEnd?.(getFullLayout());
  }, [getFullLayout, onLayoutChangeEnd]);

  const handleRemoveItem = useCallback((id: string, rowId: string, tabIds: string[]) => {
    const item = getItemByInternalId(id);
    if (!item) return;

    // [요구사항 2] 현재 탭 그룹에서 탭 하나가 꺼지면 가장 가까운 탭이 활성화
    if (activeTabMap[rowId] === id && tabIds.length > 1) {
      const closedIdx = tabIds.indexOf(id);
      const nextActiveId = closedIdx === tabIds.length - 1 
        ? tabIds[closedIdx - 1] 
        : tabIds[closedIdx + 1];
      
      setActiveTabMap(prev => ({ ...prev, [rowId]: nextActiveId }));
    }

    if (onRemoveItem) {
      onRemoveItem(item, id);
    } else if (onReorderItems) {
      onReorderItems(items.filter((i) => i !== item));
    }
  }, [activeTabMap, getItemByInternalId, items, onRemoveItem, onReorderItems, setActiveTabMap]);

  return {
    ...state,
    colSizes,
    setColSizes,
    rowSizesMap,
    setRowSizesMap,
    isColChanged,
    lastStructureRef,
    handleResizeEnd,
    handleRemoveItem,
  };
}