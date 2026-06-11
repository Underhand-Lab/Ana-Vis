import React, { useState } from 'react';
import { Div, vars } from "@shared/bridges/UIBridge";
import { AnalysisModule } from '@packages/cv-val/types/analysis-module';
import { GenericPanelLayout } from '@packages/system/GenericPanelLayout';
import ModuleContainerItem from './PanelModuleContainerItem';

interface Props {
  modules: AnalysisModule[];
  data: any;
  currentFrame: number;
  onRemoveModule: (id: string) => void;
  onReorderModules?: (newModules: AnalysisModule[]) => void; // 순서 변경 콜백 추가
  direction?: 'horizontal' | 'vertical';
  onAddModule?: () => void; // 도구 추가 콜백
}

const PanelModuleContainer: React.FC<Props> = ({
  modules,
  data,
  currentFrame,
  onRemoveModule,
  onReorderModules,
  direction = 'horizontal',
  onAddModule
}) => {
  const [settingsOpenMap, setSettingsOpenMap] = useState<Record<string, boolean>>({});

  const handleToggleSettings = (id: string) => {
    setSettingsOpenMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <GenericPanelLayout
      items={modules}
      onRemoveItem={onRemoveModule}
      onReorderItems={onReorderModules}
      onAddItem={onAddModule}
      renderTabLabel={(module, isActive) => (
        <Div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: vars.text, fontWeight: isActive ? 'bold' : 'normal' }}>
            {module.title}
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
          isSettingsOpen={!!settingsOpenMap[module.id]}
          titleNode={
            <Div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px', borderBottom: `1px solid ${vars.surface}` }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{module.title}</span>
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