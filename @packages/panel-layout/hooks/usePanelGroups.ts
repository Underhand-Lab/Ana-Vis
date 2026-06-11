import { useState, useEffect, useMemo, useRef } from 'react';

export interface PanelRow {
  id: string;
  tabs: string[];
}

const generateId = () => Math.random().toString(36).substring(2, 11);

export function usePanelGroups<T extends { id: string }>(
  items: T[],
  onReorderItems?: (newItems: T[]) => void
) {
  const [groups, setGroups] = useState<PanelRow[][]>([]); // [col][row]
  const [activeTabMap, setActiveTabMap] = useState<Record<string, string>>({}); // key: row.id
  const prevIdsRef = useRef<Set<string>>(new Set());
  const prevGroupsRef = useRef<PanelRow[][]>([]);

  const itemsMap = useMemo(() => {
    return items.reduce((acc, m) => ({ ...acc, [m.id]: m }), {} as Record<string, T>);
  }, [items]);

  // 아이템 변경 시 그룹 동기화 (신규 아이템은 기존 그룹의 탭으로 추가)
  useEffect(() => {
    setGroups(prev => {
      const activeIds = new Set(items.map(m => m.id));
      // 1. 유효하지 않은 ID 제거 및 빈 그룹 청소
      let nextGroups = prev
        .map(col => col.map(row => ({
          ...row,
          tabs: row.tabs.filter(id => activeIds.has(id))
        })).filter(row => row.tabs.length > 0))
        .filter(col => col.length > 0);

      const existingIds = new Set(nextGroups.flatMap(col => col.flatMap(row => row.tabs)));

      items.forEach(m => {
        if (!existingIds.has(m.id)) {
          if (nextGroups.length === 0) {
            nextGroups.push([{ id: generateId(), tabs: [m.id] }]);
          } else {
            // 항상 첫 번째 컬럼의 첫 번째 로우에 탭으로 추가 (이후 드래그로 이동 가능)
            nextGroups[0][0].tabs.push(m.id);
          }
        }
      });
      return nextGroups;
    });
  }, [items]);

  // 활성 탭 유효성 검사
  useEffect(() => {
    setActiveTabMap(prev => {
      const nextMap = { ...prev };
      const currentIds = groups.flatMap(col => col.flatMap(row => row.tabs));
      
      const addedId = currentIds.find(id => !prevIdsRef.current.has(id));

      groups.forEach((col) => {
        col.forEach((row) => {
          const key = row.id;
          if (addedId && row.tabs.includes(addedId)) {
            nextMap[key] = addedId;
          } else if (!row.tabs.includes(nextMap[key]) && row.tabs.length > 0) {
            const prevActiveId = prev[key];
            let nextId = row.tabs[0];

            if (prevActiveId) {
              const prevRow = prevGroupsRef.current.flatMap(c => c).find(r => r.id === row.id);
              if (prevRow) {
                const prevIdx = prevRow.tabs.indexOf(prevActiveId);
                if (prevIdx !== -1) {
                  nextId = row.tabs[Math.min(prevIdx, row.tabs.length - 1)];
                }
              }
            }
            nextMap[key] = nextId;
          }
        });
      });
      return nextMap;
    });
    prevIdsRef.current = new Set(groups.flatMap(col => col.flatMap(row => row.tabs)));
    prevGroupsRef.current = groups;
  }, [groups]);

  const handleDropLogic = (
    draggedPos: { cIdx: number; rIdx: number; iIdx: number },
    target: { cIdx: number; rIdx: number },
    dropZone: 'top' | 'bottom' | 'left' | 'right' | 'center',
  ) => {
    const next = groups.map(col => col.map(row => ({ ...row, tabs: [...row.tabs] })));
    const movedId = next[draggedPos.cIdx][draggedPos.rIdx].tabs[draggedPos.iIdx];

    next[draggedPos.cIdx][draggedPos.rIdx].tabs.splice(draggedPos.iIdx, 1);

    if (dropZone === 'center') {
      next[target.cIdx][target.rIdx].tabs.push(movedId);
    } else if (dropZone === 'left' || dropZone === 'right') {
      const ins = dropZone === 'right' ? target.cIdx + 1 : target.cIdx;
      next.splice(ins, 0, [{ id: generateId(), tabs: [movedId] }]);
    } else {
      const ins = dropZone === 'bottom' ? target.rIdx + 1 : target.rIdx;
      next[target.cIdx].splice(ins, 0, { id: generateId(), tabs: [movedId] });
    }

    const cleaned = next.map(col => col.filter(r => r.tabs.length > 0)).filter(c => c.length > 0);
    setGroups(cleaned);
    onReorderItems?.(cleaned.flatMap(col => col.flatMap(row => row.tabs)).map(id => itemsMap[id]));
  };

  return {
    groups,
    itemsMap,
    activeTabMap,
    setActiveTabMap,
    handleDropLogic,
    setGroups
  };
}