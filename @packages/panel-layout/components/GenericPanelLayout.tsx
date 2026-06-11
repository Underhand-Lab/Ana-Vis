import React, { useState, useEffect, useRef } from 'react';
import { Panel, Group, Separator } from 'react-resizable-panels';
import { Div, vars } from "@shared/bridges/UIBridge";
import { usePanelGroups, PanelRow } from '../hooks/usePanelGroups';
import { PanelGroup as PanelItemContainer } from './PanelGroup';

interface GenericPanelLayoutProps<T extends { id: string }> {
  items: T[];
  renderItem: (
    item: T, 
    handlers: { onDragStart: () => void; onDragEnd: () => void }
  ) => React.ReactNode;
  renderTabLabel?: (item: T, isActive: boolean) => React.ReactNode;
  onRemoveItem: (id: string) => void;
  onReorderItems?: (newItems: T[]) => void;
  onAddItem?: (targetItemId?: string) => void; // targetItemId를 받을 수 있도록 수정
  emptyPlaceholder?: React.ReactNode;
  labels?: {
    toVertical: string;
    toHorizontal: string;
  };
  maxColumns?: number;
  maxRows?: number;
}

// style 태그 없이 호버/액티브 상태를 처리하기 위한 내부 컴포넌트
// 매 렌더링마다 재생성되지 않도록 외부에서 정의합니다.
const ResizeHandle = ({ direction }: { direction: 'horizontal' | 'vertical' }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const isHorizontal = direction === 'horizontal';

  return (
    <Separator
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onPointerDown={() => setIsActive(true)}
      onPointerUp={() => setIsActive(false)}
      style={{ 
        height: isHorizontal ? '8px' : '', 
        width: isHorizontal ? '100%' : '8px', 
        backgroundColor: 'transparent', 
        cursor: isHorizontal ? 'row-resize' : 'col-resize', 
        display: 'flex', alignItems: 'center', 
        justifyContent: 'center', zIndex: 10, outline: 'none' 
      }}
    >
      <Div style={{ 
        height: isHorizontal ? (isHovered || isActive ? '4px' : '2px') : '100%', 
        width: isHorizontal ? '100%' : (isHovered || isActive ? '4px' : '2px'), 
        backgroundColor: isHovered || isActive ? vars.primary : vars.surface, 
        transition: isActive ? 'none' : 'all 0.15s' 
      }} />
    </Separator>
  );
};

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
  const { groups, itemsMap, activeTabMap, setActiveTabMap, handleDropLogic } = usePanelGroups(items, onReorderItems);
  const [draggedPos, setDraggedPos] = useState<{ cIdx: number; rIdx: number; iIdx: number } | null>(null);
  const [dragOverPos, setDragOverPos] = useState<{ cIdx: number; rIdx: number } | null>(null);
  const [dropZone, setDropZone] = useState<'top' | 'bottom' | 'left' | 'right' | 'center' | null>(null);

  // 포커싱 처리를 위한 상태 추적 Ref
  const lastInteractedItemId = useRef<string | null>(null);
  const targetAddItemContextRef = useRef<string | null>(null); // To store which panel's add button was clicked
  const prevItemsLengthRef = useRef(items.length);
  const prevGroupsRef = useRef<PanelRow[][]>(groups);

  if (items.length === 0) {
    return <>{emptyPlaceholder}</>;
  }

  // 탭 추가 및 드롭(합치기/분할) 후 활성 탭 동기화 로직
  useEffect(() => {
    const nextActiveTabMap = { ...activeTabMap };
    let isMapChanged = false;

    // 1. 새로운 아이템 추가 감지 및 재정렬 처리
    if (items.length > prevItemsLengthRef.current) {
      const newlyAddedId = items[items.length - 1].id;
      lastInteractedItemId.current = newlyAddedId;

      // 추가 버튼이 눌린 패널의 컨텍스트(활성 탭 ID)가 기록되어 있다면 순서 재조정 실행
      if (targetAddItemContextRef.current && onReorderItems) {
        const targetId = targetAddItemContextRef.current;
        // 새로 추가된 아이템을 제외한 나머지 아이템들 중 타겟 아이템 검색
        const targetIdx = items.slice(0, items.length - 1).findIndex(item => item.id === targetId);

        if (targetIdx !== -1 && targetIdx !== items.length - 1) {
          const newItems = [...items];
          const [addedItem] = newItems.splice(newItems.length - 1, 1);
          newItems.splice(targetIdx + 1, 0, addedItem);

          targetAddItemContextRef.current = null;
          prevItemsLengthRef.current = items.length;
          onReorderItems(newItems);
          return; // 재정렬 시 state가 변경되어 useEffect가 다시 실행되므로 조기 종료
        }
      }
      targetAddItemContextRef.current = null;
    }

    groups.forEach((column) => {
      column.forEach((row) => {
        const key = row.id;
        const currentActiveId = activeTabMap[key];

        // 2. 최근 조작(추가/드롭)된 아이템이 이 그룹에 존재하면 해당 탭을 활성화
        const hasInteractedItemInRow = lastInteractedItemId.current && row.tabs.includes(lastInteractedItemId.current);
        if (hasInteractedItemInRow) {
          const interactedId = lastInteractedItemId.current!;
          if (currentActiveId !== interactedId) {
            nextActiveTabMap[key] = interactedId;
            isMapChanged = true;
          }
        }
        // 3. 현재 활성화된 탭이 더 이상 그룹에 없거나(삭제/이동) 설정되지 않은 경우 인접 탭 활성화
        else if (!hasInteractedItemInRow && (!currentActiveId || !row.tabs.includes(currentActiveId))) {
          if (row.tabs.length > 0) {
            let nextId = row.tabs[0];

            // 인접 탭 찾기: 이전 상태에서 삭제된 탭의 인덱스를 찾아 그 자리에 오게 된 탭을 선택
            if (currentActiveId) {
              const prevRow = prevGroupsRef.current.flatMap(c => c).find(r => r.id === row.id);
              if (prevRow) {
                const prevIndex = prevRow.tabs.indexOf(currentActiveId);
                if (prevIndex !== -1) {
                  // 원래 위치(prevIndex)의 탭을 선택하되, 마지막 탭을 닫았다면 왼쪽 탭을 선택
                  const targetIndex = Math.min(prevIndex, row.tabs.length - 1);
                  nextId = row.tabs[Math.max(0, targetIndex)];
                }
              }
            }

            nextActiveTabMap[key] = nextId;
            isMapChanged = true;
          }
        }
      });
    });

    if (isMapChanged) {
      setActiveTabMap(nextActiveTabMap);
    }

    lastInteractedItemId.current = null; // 포커스 처리 완료 후 interaction ID 초기화
    prevItemsLengthRef.current = items.length;
    prevGroupsRef.current = groups;
  }, [groups, items, activeTabMap, setActiveTabMap, onReorderItems]);

  const onPanelDragOver = (cIdx: number, rIdx: number, e: React.DragEvent, zone?: 'center') => {
    e.preventDefault();
    // 같은 패널에 하나뿐인 탭인 경우 무시
    if (draggedPos?.cIdx === cIdx && draggedPos?.rIdx === rIdx && groups[cIdx][rIdx].tabs.length === 1) return;

    if (zone === 'center') {
      setDragOverPos({ cIdx, rIdx });
      setDropZone('center');
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const edge = 0.2;

    let targetZone: typeof dropZone = 'center';
    
    if (x < rect.width * edge) targetZone = 'left';
    else if (x > rect.width * (1 - edge)) targetZone = 'right';
    else if (y < rect.height * edge) targetZone = 'top';
    else if (y > rect.height * (1 - edge)) targetZone = 'bottom';

    // 최대 분할 수 제한 로직 적용
    // 좌우 분할 제한: 새로운 열이 추가되어야 하는 경우(left/right) 현재 열 개수 체크
    if (maxColumns && (targetZone === 'left' || targetZone === 'right') && groups.length >= maxColumns) {
      targetZone = 'center';
    }
    // 상하 분할 제한: 현재 해당 열(column)의 행 개수가 maxRows 이상이면 분할 금지
    if (maxRows && (targetZone === 'top' || targetZone === 'bottom') && groups[cIdx].length >= maxRows) {
      targetZone = 'center';
    }

    setDragOverPos({ cIdx, rIdx });
    setDropZone(targetZone);
  };

  const onPanelDrop = (cIdx: number, rIdx: number) => {
    if (draggedPos && dropZone) {
      // 드롭되는 아이템의 ID를 기록하여 이동 후 포커싱되도록 함
      const draggedId = groups[draggedPos.cIdx][draggedPos.rIdx].tabs[draggedPos.iIdx];
      lastInteractedItemId.current = draggedId;
      
      handleDropLogic(draggedPos, { cIdx, rIdx }, dropZone);
    }
    handleDragEnd();
  };

  const onPanelDragLeave = () => {
    // 드래그 중인 정보(draggedPos)는 여기서 초기화하면 안 됩니다.
    // 오버레이 관련 상태만 초기화하여 잔상을 제거합니다.
    setDragOverPos(null);
    setDropZone(null);
  };

  const handleDragEnd = () => {
    setDraggedPos(null);
    onPanelDragLeave();
  };

  return (
    <Div className="generic-panel-container" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', position: 'relative', backgroundColor: vars.background }}>
      <Group orientation="horizontal" style={{ flex: 1 }}>
        {groups.flatMap((column, cIdx) => {
          const colElements: React.ReactNode[] = [
            <Panel key={`col-${cIdx}`} id={`col-${cIdx}`} defaultSize={100 / groups.length} minSize={10}>
              <Group orientation="vertical">
                {column.flatMap((row, rIdx) => {
                  const rowElements: React.ReactNode[] = [
                    <Panel key={row.id} id={row.id} defaultSize={100 / column.length} minSize={10}>
                      <PanelItemContainer
                        cIdx={cIdx} rIdx={rIdx} group={row.tabs} itemsMap={itemsMap}
                        activeTabId={activeTabMap[row.id]}
                        onSelectTab={(id) => setActiveTabMap(prev => ({ ...prev, [row.id]: id }))}
                        onRemoveItem={onRemoveItem}
                        renderTabLabel={renderTabLabel}
                        // PanelGroup에 전달하기 전, 자신의 컨텍스트(활성 탭 ID)를 기록하도록 래핑
                        onAddItem={onAddItem ? (cIdx, rIdx) => {
                          const activeId = activeTabMap[row.id];
                          targetAddItemContextRef.current = activeId;
                          onAddItem(activeId); // 부모에게 현재 위치의 탭 ID를 전달
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