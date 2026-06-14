import { useState, useEffect, useRef, useCallback } from 'react';
import { AnalysisModule } from '@packages/cv-val/types/analysis-module';
import { 
  GenericPanelLayoutHandle, 
  SerializedPanelLayout, 
  PanelLayout, 
  LayoutItem 
} from '@packages/panel-layout/components/GenericPanelLayout';

const LAYOUT_STORAGE_KEY = 'cv-val-panel-layout-v1';

export const getModuleType = (id: string) => {
  const lastHyphenIndex = id.lastIndexOf('-');
  return (lastHyphenIndex !== -1 && !isNaN(Number(id.substring(lastHyphenIndex + 1))))
    ? id.substring(0, lastHyphenIndex)
    : id;
};

export function usePanelStorage<S = any>(
  modules: AnalysisModule<S>[],
  moduleRegistry: Record<string, AnalysisModule<S>>,
  onReorderModules?: (newModules: AnalysisModule<S>[]) => void,
  layoutHandle?: React.RefObject<GenericPanelLayoutHandle<AnalysisModule<S>> | null>
) {
  // 초기 렌더링 시점에 즉시 저장소를 읽어 비율 소실 방지
  const [injectedLayout, setInjectedLayout] = useState<SerializedPanelLayout | undefined>(() => {
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return parsed.layout as SerializedPanelLayout;
      } catch (e) {}
    }
    return undefined;
  });

  const [currentLayout, setCurrentLayout] = useState<SerializedPanelLayout | null>(null);
  const [settingsMap, setSettingsMap] = useState<Record<string, S>>(() => {
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (raw) {
      try {
        return JSON.parse(raw).settingsMap || {};
      } catch (e) {}
    }
    return {};
  });

  const handleSettingsChange = useCallback((id: string, newSettings: S) => {
    setSettingsMap(prev => ({ ...prev, [id]: newSettings }));
  }, []);

  const isInitialized = useRef(false);
  const isRestorationPending = useRef(false);
  const expectedModuleCount = useRef(0);

  useEffect(() => {
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!raw || !onReorderModules) {
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      const savedLayout = parsed.layout as SerializedPanelLayout;
      const savedSettingsMap = parsed.settingsMap || {};
      
      if (savedLayout?.panelTypes && Object.keys(savedLayout.panelTypes).length > 0) {
        const restoredModules: (AnalysisModule<S> & { id: string })[] = [];

        Object.entries(savedLayout.panelTypes).forEach(([id, type]) => {
          const template = Object.values(moduleRegistry).find((mod) => mod.type === type);
          if (template) {
            restoredModules.push({ ...template, id });
          }
        });

        if (restoredModules.length > 0) {
          isRestorationPending.current = true;
          expectedModuleCount.current = restoredModules.length;

          onReorderModules(restoredModules);

          setSettingsMap(savedSettingsMap);
          setInjectedLayout(savedLayout);
        } else {
           isInitialized.current = true;
        }
      }
    } catch (e) {
      console.error("Failed to restore layout internally:", e);
      isInitialized.current = true;
    } finally {
      if (!isRestorationPending.current) {
        isInitialized.current = true;
      }
    }
  }, []);

  const handleLayoutChange = useCallback((layoutWithItems: PanelLayout<AnalysisModule<S>>) => {
    // GenericPanelLayout에서 T 객체를 받아왔으므로, 저장할 수 있는 JSON 형태로 직렬화합니다.
    const panelTypes: Record<string, string> = {};
    const allExistTabIds = new Set<string>();
    const allExistRowIds = new Set<string>();

    const serializedGroups = layoutWithItems.groups.map((col) =>
      col.map((row) => {
        allExistRowIds.add(row.id);
        const tabIds = row.tabs.map((item: LayoutItem<AnalysisModule<S>>) => {
          panelTypes[item.id] = item.data.type;
          allExistTabIds.add(item.id);
          return item.id;
        });
        return {
          id: row.id,
          width: row.width,
          height: row.height,
          tabs: tabIds
        };
      })
    );

    // 존재하지 않는 탭이나 로우에 대한 activeTabMap 정보 필터링
    const cleanedActiveTabMap: Record<string, string> = {};
    if (layoutWithItems.activeTabMap) {
      Object.entries(layoutWithItems.activeTabMap).forEach(([rowId, tabId]) => {
        if (allExistRowIds.has(rowId) && allExistTabIds.has(tabId as string)) {
          cleanedActiveTabMap[rowId] = tabId as string;
        }
      });
    }

    setCurrentLayout({
      groups: serializedGroups,
      activeTabMap: cleanedActiveTabMap,
      panelTypes
    });
  }, []);

  useEffect(() => {
    if (isRestorationPending.current) {
      if (modules.length === expectedModuleCount.current) {
        isRestorationPending.current = false;
        isInitialized.current = true;
      } else {
        return;
      }
    }

    if (!isInitialized.current) return;
    if (currentLayout === null || modules.length === 0) return;

    const currentLayoutIds = Object.keys(currentLayout.panelTypes || {});
    const modulesIds = modules.map(m => {
      // 도메인 모델에 id가 남아있을 수 있는 경우를 대비한 안전한 접근
      const legacyId = (m as unknown as { id?: string }).id;
      return legacyId || (layoutHandle?.current ? layoutHandle.current.getInternalId(m) : undefined);
    });
    
    // 모든 모듈의 ID가 준비되었고 레이아웃 데이터의 개수와 일치하는지 확인
    const isSynced = modulesIds.length === currentLayoutIds.length && 
                     modulesIds.every(id => id !== undefined && currentLayoutIds.includes(id));

    if (isSynced) {
      const dataToSaveObj = {
        layout: currentLayout,
        moduleTypes: modules.map(m => m.type),
        settingsMap
      };
      const dataToSaveStr = JSON.stringify(dataToSaveObj);

      const lastSaved = localStorage.getItem(LAYOUT_STORAGE_KEY);
      if (lastSaved === dataToSaveStr) return;
      console.log('Layout Saved:', dataToSaveObj);
      localStorage.setItem(LAYOUT_STORAGE_KEY, dataToSaveStr);
    }
  }, [currentLayout, modules, settingsMap]);

  return {
    injectedLayout,
    handleLayoutChange,
    settingsMap,
    handleSettingsChange
  };
}
