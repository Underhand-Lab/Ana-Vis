import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@shared/utils/i18n';
import { Div, vars } from "@shared/bridges/UIBridge";
import { AnalysisModule } from '@packages/cv-val/types/analysis-module';
import { GenericPanelLayout } from '@packages/panel-layout/components/GenericPanelLayout';
import ModuleContainerItem, { registeredModuleTypes } from '@packages/cv-val/component/panel-module-container/PanelModuleContainerItem';
import { usePanelStorage, getModuleType } from './usePanelStorage';

interface Props {
  modules: AnalysisModule[];
  moduleRegistry: Record<string, any>; // 모듈 복원을 위해 필요
  data: any;
  currentFrame: number;
  onNextFrame?: () => void;
  onCandidateSelect?: (frameIdx: number, candidateIdx: number, type?: string) => void;
  onRemoveModule: (id: string) => void;
  onReorderModules?: (newModules: AnalysisModule[]) => void;
  onAddModule?: () => Promise<AnalysisModule | undefined>; // 아이템 생성 후 반환받아 위치 및 포커스 처리
}

const PanelModuleContainer: React.FC<Props> = ({
  modules,
  moduleRegistry,
  data,
  currentFrame,
  onNextFrame,
  onCandidateSelect,
  onRemoveModule,
  onReorderModules,
  onAddModule,
}) => {
  const { t } = useTranslation();
  const [settingsOpenMap, setSettingsOpenMap] = useState<Record<string, boolean>>({});
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  // 패널 레이아웃 복원 및 저장 로직을 커스텀 훅으로 분리
  const { injectedLayout, handleLayoutChange, settingsMap, handleSettingsChange } = usePanelStorage(modules, moduleRegistry, onReorderModules);

  // 모듈들에 정의된 로케일 정보를 i18n에 동적으로 등록 (첫 렌더링 시점에 동기 등록되도록 함)
  useMemo(() => {
    modules.forEach((module) => {
      const moduleType = getModuleType(module.id);
      const locales = module.locales;
      if (locales && !registeredModuleTypes.has(moduleType)) {
        Object.entries(locales).forEach(([lng, resources]) => {
          i18n.addResourceBundle(lng, 'translation', resources as any, true, true);
        });
        registeredModuleTypes.add(moduleType);
      }
    });
  }, [modules]);

  const handleToggleSettings = (id: string) => {
    setSettingsOpenMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // 반응형 분할 제한 설정을 위한 윈도우 리사이즈 감지
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 모바일: 좌우 분할 불가(maxColumns: 1), 상하 분할 최대 1개선(즉, 2행, maxRows: 2)
  // 데스크톱: 제한 없음 (undefined)
  const maxColumns = isMobile ? 1 : undefined;
  const maxRows = isMobile ? 2 : undefined;

  // 모듈 ID에서 타입을 추출하고 번역된 제목을 반환하는 헬퍼 함수
  const getModuleTitle = (module: AnalysisModule) => {
    const moduleType = getModuleType(module.id);
    return t(`analysisTools.${moduleType}`, module.title);
  };

  // GenericPanelLayout이 panelTypes를 올바르게 생성하여 저장할 수 있도록 
  // 각 모듈 객체에 추출된 type 속성을 주입합니다.
  const modulesWithType = useMemo(() => {
    return modules.map(m => ({ ...m, type: getModuleType(m.id) }));
  }, [modules]);

  return (
    <GenericPanelLayout
      items={modulesWithType}
      onRemoveItem={onRemoveModule}
      onReorderItems={onReorderModules}
      onAddItem={onAddModule}
      layout={injectedLayout}
      onLayoutChangeEnd={handleLayoutChange}
      maxColumns={maxColumns}
      maxRows={maxRows}
      renderTabLabel={(module, isActive) => (
        <Div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: vars.text, fontWeight: isActive ? 'bold' : 'normal' }}>
            {getModuleTitle(module)}
          </span>
          {isActive && (
            <button
              onClick={(e) => { e.stopPropagation(); handleToggleSettings(module.id); }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
                fontSize: '10px', opacity: settingsOpenMap[module.id] ? 1 : 0.6
              }}
            >
              ⚙️
            </button>
          )}
        </Div>
      )}
      emptyPlaceholder={
        <Div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: vars.text, opacity: 0.5, fontSize: '14px'
        }}>
          활성화된 분석 도구가 없습니다. 상단 메뉴에서 도구를 추가해주세요.
        </Div>
      }
      renderItem={(module) => (
        <ModuleContainerItem
          module={module}
          data={data}
          currentFrame={currentFrame}
          onNextFrame={onNextFrame}
          onCandidateSelect={onCandidateSelect}
          isSettingsOpen={!!settingsOpenMap[module.id]}
          settings={settingsMap[module.id] ?? module.defaultSettings}
          onSettingsChange={(newSettings) => handleSettingsChange(module.id, newSettings)}
          titleNode={
            <Div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px', borderBottom: `1px solid ${vars.surface}` }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{getModuleTitle(module)}</span>
              <button onClick={() => handleToggleSettings(module.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>⚙️</button>
            </Div>
          }
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            margin: 0, borderRadius: 0
          }}
        />
      )}
    />
  );
};

export default PanelModuleContainer;
