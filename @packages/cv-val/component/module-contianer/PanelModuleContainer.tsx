import React from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Div, vars } from "@shared/bridges/UIBridge";
import { AnalysisModule } from '@packages/cv-val/types/analysis-module';
import ModuleContainerItem from '../module-container-item/ModuleContainerItem';

interface Props {
  modules: AnalysisModule[];
  data: any;
  currentFrame: number;
  onRemoveModule: (id: string) => void;
  direction?: 'horizontal' | 'vertical';
}

/**
 * PanelModuleContainer
 * react-resizable-panels를 사용하여 분석 모듈들을 패널 형태로 배치합니다.
 * 모듈 간의 경계선을 드래그하여 크기를 자유롭게 조절할 수 있습니다.
 */
const PanelModuleContainer: React.FC<Props> = ({ 
  modules, 
  data, 
  currentFrame, 
  onRemoveModule,
  direction = 'horizontal' 
}) => {
  if (modules.length === 0) {
    return (
      <Div style={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        color: vars.text, 
        opacity: 0.5,
        fontSize: '14px'
      }}>
        활성화된 분석 도구가 없습니다. 상단 메뉴에서 도구를 추가해주세요.
      </Div>
    );
  }

  return (
    <Div className="panel-module-container" style={{ width: '100%', height: '100%', flex: 1, overflow: 'hidden' }}>
      <PanelGroup direction={direction} autoSaveId="cv-val-analysis-layout">
        {modules.map((module, index) => (
          <React.Fragment key={module.id}>
            <Panel defaultSize={100 / modules.length} minSize={10}>
              <ModuleContainerItem
                module={module}
                data={data}
                currentFrame={currentFrame}
                onRemove={onRemoveModule}
                // 패널 내부에 꽉 차도록 스타일 조정
                style={{ width: '100%', height: '100%', margin: 0, borderRadius: 0 }}
              />
            </Panel>
            
            {/* 마지막 패널 뒤에는 핸들을 생성하지 않음 */}
            {index < modules.length - 1 && (
              <PanelResizeHandle className="panel-resizer" />
            )}
          </React.Fragment>
        ))}
      </PanelGroup>

      <style>{`
        .panel-module-container {
          background-color: ${vars.box};
        }
        .panel-resizer {
          width: 6px;
          background-color: transparent;
          transition: background-color 0.2s ease;
          position: relative;
          z-index: 10;
        }
        .panel-resizer[data-panel-group-direction="vertical"] {
          height: 6px;
          width: 100%;
        }
        .panel-resizer:hover,
        .panel-resizer[data-resize-handle-active] {
          background-color: ${vars.primary};
        }
      `}</style>
    </Div>
  );
};

export default PanelModuleContainer;