import React, { useEffect } from 'react';

interface PanelItemLifecycleWrapperProps<T> {
  item: T;
  id: string;
  onInit?: (item: T, id: string) => void;
  onCleanup?: (item: T, id: string) => void;
  deps?: any[];
  children: React.ReactNode;
}

/** 아이템의 생명주기와 리인젝션을 관리하는 내부 래퍼 */
export function PanelItemLifecycleWrapper<T>({ 
  item, id, onInit, onCleanup, deps = [], children 
}: PanelItemLifecycleWrapperProps<T>) {
  useEffect(() => {
    onInit?.(item, id);
    return () => onCleanup?.(item, id);
  }, [id, ...deps]);

  return <>{children}</>;
}
