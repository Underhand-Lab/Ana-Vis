import { useRef, useMemo, useCallback } from 'react';
import { LayoutItem } from './useGenericPanelLayout';

export function usePanelRegistry<T>(
  items: T[],
  onRemoveItem?: (item: T, id: string) => void,
  onReorderItems?: (newItems: T[]) => void,
) {
  const idRegistry = useRef(new Map<T, string>());
  const prevItemsRef = useRef<T[]>([]);
  const newlyAddedIdRef = useRef<string | null>(null);

  const wrappedItems = useMemo((): LayoutItem<T>[] => {
    return items.map(item => {
      let id = idRegistry.current.get(item);
      if (!id) {
        id = String((item as any).id || (item as any).uuid || Math.random().toString(36).substring(2, 11));
        idRegistry.current.set(item, id);

        if (prevItemsRef.current.length > 0 && !prevItemsRef.current.includes(item)) {
          newlyAddedIdRef.current = id;
        }
      }
      return { id, data: item };
    });
  }, [items]);

  const handleRemoveItem = useCallback((
    id: string, 
    rowId: string, 
    tabIds: string[], 
    activeTabMap: Record<string, string>,
    setActiveTabMap: React.Dispatch<React.SetStateAction<Record<string, string>>>,
    getItemByInternalId: (id: string) => T | undefined
  ) => {
    const item = getItemByInternalId(id);
    if (!item) return;

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
  }, [items, onRemoveItem, onReorderItems]);

  return {
    wrappedItems,
    idRegistry,
    newlyAddedIdRef,
    prevItemsRef,
    handleRemoveItem,
  };
}