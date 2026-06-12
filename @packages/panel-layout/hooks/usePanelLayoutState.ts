import { useState, useEffect, useRef } from 'react';
import { usePanelGroups, PanelRow } from './usePanelGroups';

export function usePanelLayoutState<T extends { id: string }>(
  items: T[],
  onReorderItems?: (newItems: T[]) => void,
  maxColumns?: number,
  maxRows?: number,
  layout?: any
) {
  const {
    groups,
    itemsMap,
    activeTabMap,
    setActiveTabMap,
    handleDropLogic,
    setGroups,
    pendingInsertTargetRef
  } = usePanelGroups(items, onReorderItems, layout);

  const [draggedPos, setDraggedPos] = useState<{ cIdx: number; rIdx: number; iIdx: number } | null>(null);
  const [dragOverPos, setDragOverPos] = useState<{ cIdx: number; rIdx: number } | null>(null);
  const [dropZone, setDropZone] = useState<'top' | 'bottom' | 'left' | 'right' | 'center' | null>(null);

  const pendingAddTargetRef = useRef<string | null>(null);
  const lastInteractedItemId = useRef<string | null>(null);
  const prevItemsLengthRef = useRef(items.length);
  const prevGroupsRef = useRef<PanelRow[][]>(groups);

  useEffect(() => {
    const nextActiveTabMap = { ...activeTabMap };
    let isMapChanged = false;

    // Detect new item additions for focusing and reordering
    if (items.length > prevItemsLengthRef.current) {
      const prevTabs = prevGroupsRef.current.flatMap(c => c).flatMap(r => r.tabs);
      const newItem = items.find(it => !prevTabs.includes(it.id));

      if (newItem) {
        lastInteractedItemId.current = newItem.id;

        if (pendingAddTargetRef.current && onReorderItems) {
          const targetId = pendingAddTargetRef.current;
          pendingAddTargetRef.current = null;

          const nextItems = [...items];
          const itemIdx = nextItems.findIndex(i => i.id === newItem.id);
          if (itemIdx !== -1) {
            const [removed] = nextItems.splice(itemIdx, 1);
            const newItemsOrder: T[] = [];
            let inserted = false;
            for (const existingItem of items) {
              if (existingItem.id === newItem.id) continue;
              newItemsOrder.push(existingItem);
              if (existingItem.id === targetId && !inserted) {
                newItemsOrder.push(removed);
                inserted = true;
              }
            }
            if (!inserted) newItemsOrder.push(removed);
            onReorderItems(newItemsOrder);
            return;
          }
        } else {
          groups.forEach(col => col.forEach(row => {
            if (row.tabs.includes(newItem.id) && nextActiveTabMap[row.id] !== newItem.id) {
              nextActiveTabMap[row.id] = newItem.id;
              isMapChanged = true;
            }
          }));
        }
      }
    }

    groups.forEach((column) => {
      column.forEach((row) => {
        const key = row.id;
        const currentActiveId = activeTabMap[key];
        const hasInteracted = lastInteractedItemId.current && row.tabs.includes(lastInteractedItemId.current);

        if (hasInteracted) {
          const interactedId = lastInteractedItemId.current!;
          if (currentActiveId !== interactedId) {
            nextActiveTabMap[key] = interactedId;
            isMapChanged = true;
          }
        } else if (!currentActiveId || !row.tabs.includes(currentActiveId)) {
          if (row.tabs.length > 0) {
            let nextId = row.tabs[0];
            if (currentActiveId) {
              const prevRow = prevGroupsRef.current.flatMap(c => c).find(r => r.id === row.id);
              if (prevRow) {
                const prevIndex = prevRow.tabs.indexOf(currentActiveId);
                const targetIndex = Math.min(prevIndex, row.tabs.length - 1);
                nextId = row.tabs[Math.max(0, targetIndex)];
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

    lastInteractedItemId.current = null;
    prevItemsLengthRef.current = items.length;
    prevGroupsRef.current = groups;
  }, [groups, items, activeTabMap, setActiveTabMap, onReorderItems]);

  const onPanelDragOver = (cIdx: number, rIdx: number, e: React.DragEvent, zone?: 'center') => {
    e.preventDefault();
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

    if (maxColumns && (targetZone === 'left' || targetZone === 'right') && groups.length >= maxColumns) {
      targetZone = 'center';
    }
    if (maxRows && (targetZone === 'top' || targetZone === 'bottom') && groups[cIdx].length >= maxRows) {
      targetZone = 'center';
    }

    setDragOverPos({ cIdx, rIdx });
    setDropZone(targetZone);
  };

  const onPanelDrop = (cIdx: number, rIdx: number) => {
    if (draggedPos && dropZone) {
      const draggedId = groups[draggedPos.cIdx][draggedPos.rIdx].tabs[draggedPos.iIdx];
      lastInteractedItemId.current = draggedId;
      handleDropLogic(draggedPos, { cIdx, rIdx }, dropZone);
    }
    handleDragEnd();
  };

  const onPanelDragLeave = () => {
    setDragOverPos(null);
    setDropZone(null);
  };

  const handleDragEnd = () => {
    setDraggedPos(null);
    onPanelDragLeave();
  };

  return {
    groups,
    itemsMap,
    activeTabMap,
    setActiveTabMap,
    draggedPos,
    setDraggedPos,
    dragOverPos,
    dropZone,
    pendingAddTargetRef,
    pendingInsertTargetRef,
    lastInteractedItemId,
    onPanelDragOver,
    onPanelDrop,
    onPanelDragLeave,
    handleDragEnd,
    setGroups
  };
}
