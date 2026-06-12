import { useState, useEffect, useRef, useCallback } from 'react';
import { AnalysisModule } from '@packages/cv-val/types/analysis-module';

const LAYOUT_STORAGE_KEY = 'cv-val-panel-layout-v1';

export const getModuleType = (id: string) => {
  const lastHyphenIndex = id.lastIndexOf('-');
  return (lastHyphenIndex !== -1 && !isNaN(Number(id.substring(lastHyphenIndex + 1))))
    ? id.substring(0, lastHyphenIndex)
    : id;
};

export function usePanelStorage(
  modules: AnalysisModule[],
  moduleRegistry: Record<string, any>,
  onReorderModules?: (newModules: AnalysisModule[]) => void
) {
  const [currentLayout, setCurrentLayout] = useState<any>(null); 
  const [injectedLayout, setInjectedLayout] = useState<any>(undefined);
  const [settingsMap, setSettingsMap] = useState<Record<string, any>>({});

  const handleSettingsChange = useCallback((id: string, newSettings: any) => {
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
      const savedLayout = parsed.layout;
      const savedSettingsMap = parsed.settingsMap || {};
      
      if (savedLayout?.panelTypes && Object.keys(savedLayout.panelTypes).length > 0) {
        const restoredModules: AnalysisModule[] = [];

        Object.entries(savedLayout.panelTypes).forEach(([id, type]) => {
          const template = Object.values(moduleRegistry).find((mod: any) => mod.id === type) || moduleRegistry[type as string];
          if (template) {
            // 이전에 저장된 ID를 그대로 사용하여 복원 (새로운 ID 발급 제거)
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

  const handleLayoutChange = useCallback((layoutWithItems: any) => {
    // GenericPanelLayout에서 T 객체를 받아왔으므로, 저장할 수 있는 JSON 형태로 직렬화합니다.
    const panelTypes: Record<string, string> = {};
    const serializedGroups = layoutWithItems.groups.map((col: any) =>
      col.map((row: any) => ({
        ...row,
        tabs: row.tabs.map((item: any) => {
          panelTypes[item.id] = getModuleType(item.id);
          return item.id;
        })
      }))
    );

    setCurrentLayout({
      groups: serializedGroups,
      activeTabMap: layoutWithItems.activeTabMap,
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
    const modulesIds = modules.map(m => m.id);
    
    const isSynced = currentLayoutIds.length === modulesIds.length && 
                     modulesIds.every(id => currentLayoutIds.includes(id));

    if (isSynced) {
      const dataToSaveObj = {
        layout: currentLayout,
        moduleTypes: modules.map(m => getModuleType(m.id)),
        settingsMap
      };
      const dataToSaveStr = JSON.stringify(dataToSaveObj);

      const lastSaved = localStorage.getItem(LAYOUT_STORAGE_KEY);
      if (lastSaved === dataToSaveStr) return;

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
