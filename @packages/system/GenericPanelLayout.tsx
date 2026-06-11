import React, { useState, useEffect, useRef } from 'react';
import { Panel, Group, Separator } from 'react-resizable-panels';
import { Div, vars } from "@shared/bridges/UIBridge";
import { usePanelGroups, PanelRow } from './usePanelGroups';
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
  onAddItem?: () => void; // 도구 추가 함수 주입
  emptyPlaceholder?: React.ReactNode;
  labels?: {
    toVertical: string;
    toHorizontal: string;
  };
}

export function GenericPanelLayout<T extends { id: string }>({
  items,
  renderItem,
  onRemoveItem,
  onReorderItems,
  onAddItem,
  emptyPlaceholder,
  renderTabLabel,
}: GenericPanelLayoutProps<T>) {
  const { groups, itemsMap, activeTabMap, setActiveTabMap, handleDropLogic } = usePanelGroups(items, onReorderItems);
  const [draggedPos, setDraggedPos] = useState<{ cIdx: number; rIdx: number; iIdx: number } | null>(null);
  const [dragOverPos, setDragOverPos] = useState<{ cIdx: number; rIdx: number } | null>(null);
  const [dropZone, setDropZone] = useState<'top' | 'bottom' | 'left' | 'right' | 'center' | null>(null);

  // 포커싱 처리를 위한 상태 추적 Ref
  const lastInteractedItemId = useRef<string | null>(null);
  const prevItemsLength = useRef(items.length);
  const prevGroupsRef = useRef<PanelRow[][]>(groups);

  if (items.length === 0) {
    return <>{emptyPlaceholder}</>;
  }

  // 탭 추가 및 드롭(합치기/분할) 후 활성 탭 동기화 로직
  useEffect(() => {
    const nextActiveTabMap = { ...activeTabMap };
    let isMapChanged = false;

    // 1. 새로운 아이템이 추가된 경우 마지막 아이템을 포커싱 대상으로 설정
    if (items.length > prevItemsLength.current) {
      lastInteractedItemId.current = items[items.length - 1].id;
    }
    prevItemsLength.current = items.length;

    groups.forEach((column) => {
      column.forEach((row) => {
        const key = row.id;
        const currentActiveId = activeTabMap[key];

        // 2. 최근 조작(추가/드롭)된 아이템이 이 그룹에 존재하면 해당 탭을 활성화
        if (lastInteractedItemId.current && row.tabs.includes(lastInteractedItemId.current)) {
          if (currentActiveId !== lastInteractedItemId.current) {
            nextActiveTabMap[key] = lastInteractedItemId.current;
            isMapChanged = true;
          }
        }
        // 3. 현재 활성화된 탭이 더 이상 그룹에 없거나(삭제/이동) 설정되지 않은 경우 인접 탭 활성화
        else if (!currentActiveId || !row.tabs.includes(currentActiveId)) {
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
      lastInteractedItemId.current = null; // 포커스 적용 완료 후 초기화
    }

    prevGroupsRef.current = groups;
  }, [groups, items, activeTabMap, setActiveTabMap]);

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
    
    setDragOverPos({ cIdx, rIdx });
    if (x < rect.width * edge) setDropZone('left');
    else if (x > rect.width * (1 - edge)) setDropZone('right');
    else if (y < rect.height * edge) setDropZone('top');
    else if (y > rect.height * (1 - edge)) setDropZone('bottom');
    else setDropZone('center');
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
      {onAddItem && (
        <Div style={{ position: 'absolute', top: '6px', right: '12px', zIndex: 110 }}>
          <button onClick={onAddItem} style={{ width: '24px', height: '24px', backgroundColor: vars.box, color: vars.text, border: `1px solid ${vars.surface}`, borderRadius: '4px', cursor: 'pointer' }}>+</button>
        </Div>
      )}

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
                      <Separator 
                        key={`sep-row-${row.id}`}
                        className="panel-separator"
                        data-direction="horizontal"
                        style={{ 
                          height: '8px', width: '100%', backgroundColor: 'transparent', 
                          cursor: 'row-resize', display: 'flex', alignItems: 'center', 
                          justifyContent: 'center', zIndex: 10, outline: 'none' 
                        }}
                      >
                        <Div className="resizer-inner" style={{ height: '2px', width: '100%', backgroundColor: vars.surface, transition: 'background-color 0.15s' }} />
                      </Separator>
                    );
                  }
                  return rowElements;
                })}
              </Group>
            </Panel>
          ];
          if (cIdx < groups.length - 1) {
            colElements.push(
              <Separator 
                key={`sep-col-${cIdx}`}
                className="panel-separator"
                data-direction="vertical"
                style={{ 
                  width: '8px', backgroundColor: 'transparent', 
                  cursor: 'col-resize', display: 'flex', alignItems: 'center', 
                  justifyContent: 'center', zIndex: 10, outline: 'none'
                }}
              >
                <Div className="resizer-inner" style={{ width: '2px', height: '100%', backgroundColor: vars.surface, transition: 'background-color 0.15s' }} />
              </Separator>
            );
          }
          return colElements;
        })}
      </Group>

      <style>{`
        .panel-separator:hover .resizer-inner,
        .panel-separator:active .resizer-inner {
          background-color: ${vars.primary} !important;
        }
        
        /* 가로 구분선 (상하 조절용) 호버 시 높이 강조 */
        .panel-separator[data-direction="horizontal"]:hover .resizer-inner {
          height: 4px !important;
        }
        
        /* 세로 구분선 (좌우 조절용) 호버 시 너비 강조 */
        .panel-separator[data-direction="vertical"]:hover .resizer-inner {
          width: 4px !important;
        }
        
        .panel-separator:active .resizer-inner {
          transition: none;
        }
      `}</style>
    </Div>
  );
}