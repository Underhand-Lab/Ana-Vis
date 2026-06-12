import { useState, useEffect, useRef, useCallback } from 'react';
import { AnalysisModule } from '@packages/cv-val/types/analysis-module';

const LAYOUT_STORAGE_KEY = 'cv-val-panel-layout-v1';

export const getModuleType = (id: string) => {
  const lastHyphenIndex = id.lastIndexOf('-');
  return (lastHyphenIndex !== -1 && !isNaN(Number(id.substring(lastHyphenIndex + 1))))
    ? id.substring(0, lastHyphenIndex)
    : id;
};

const generateUniqueId = () => Date.now().toString() + Math.floor(Math.random() * 1000).toString();

export function usePanelStorage(
  modules: AnalysisModule[],
  moduleRegistry: Record<string, any>,
  onReorderModules?: (newModules: AnalysisModule[]) => void
) {
  const [currentLayout, setCurrentLayout] = useState<any>(null); 
  const [injectedLayout, setInjectedLayout] = useState<any>(undefined);

  const isInitialized = useRef(false);
  const isRestorationPending = useRef(false);
  const expectedModuleCount = useRef(0);

  useEffect(() => {
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!raw || !onReorderModules) {
      console.log('[Layout Debug] No saved layout found. Starting fresh.');
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      const savedLayout = parsed.layout;
      
      if (savedLayout?.panelTypes && Object.keys(savedLayout.panelTypes).length > 0) {
        const oldIdToNewIdMap: Record<string, string> = {};
        const restoredModules: AnalysisModule[] = [];
        const newLayout = JSON.parse(JSON.stringify(savedLayout));

        Object.entries(savedLayout.panelTypes).forEach(([oldId, type]) => {
          const newId = `${type}-${generateUniqueId()}`;
          oldIdToNewIdMap[oldId] = newId;

          const template = Object.values(moduleRegistry).find((mod: any) => mod.id === type) || moduleRegistry[type as string];
          if (template) {
            restoredModules.push({ ...template, id: newId });
          }
        });

        if (restoredModules.length > 0) {
          isRestorationPending.current = true;
          expectedModuleCount.current = restoredModules.length;

          onReorderModules(restoredModules);

          newLayout.groups = newLayout.groups.map((col: any) =>
            col.map((row: any) => ({
              ...row,
              tabs: row.tabs.map((tabId: string) => oldIdToNewIdMap[tabId] || tabId)
            }))
          );

          newLayout.activeTabMap = Object.fromEntries(
            Object.entries(newLayout.activeTabMap).map(([rowId, activeTabId]) => [
              rowId,
              oldIdToNewIdMap[activeTabId as string] || activeTabId
            ])
          );

          newLayout.panelTypes = Object.fromEntries(
            Object.entries(savedLayout.panelTypes).map(([oldId, type]) => [
              oldIdToNewIdMap[oldId] || oldId,
              type
            ])
          );

          console.log('[Layout Debug] Final injected layout (after ID mapping):', newLayout);
          setInjectedLayout(newLayout);
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

  const handleLayoutChange = useCallback((layoutJson: any) => {
    setCurrentLayout(layoutJson);
  }, []);

  useEffect(() => {
    if (isRestorationPending.current) {
      if (modules.length === expectedModuleCount.current) {
        isRestorationPending.current = false;
        isInitialized.current = true;
        console.log('[Layout Debug] Restoration confirmed in props. Saving enabled.');
      } else {
        console.log('[Layout Debug] Save skipped: Waiting for restoration to reflect in props.');
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
        moduleTypes: modules.map(m => getModuleType(m.id))
      };
      const dataToSaveStr = JSON.stringify(dataToSaveObj);

      const lastSaved = localStorage.getItem(LAYOUT_STORAGE_KEY);
      if (lastSaved === dataToSaveStr) return;

      console.log('[Layout Debug] Persisting to storage now (Synced):', dataToSaveObj);
      localStorage.setItem(LAYOUT_STORAGE_KEY, dataToSaveStr);
    } else {
      console.log('[Layout Debug] Save skipped: Layout and Modules out of sync.');
    }
  }, [currentLayout, modules]);

  return {
    injectedLayout,
    handleLayoutChange
  };
}
