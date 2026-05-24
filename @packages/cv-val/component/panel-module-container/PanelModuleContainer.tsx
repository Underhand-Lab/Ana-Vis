import React, { useState, useEffect, useMemo } from 'react';
import { Panel, Group, Separator } from 'react-resizable-panels';
import { Div, vars } from "@shared/bridges/UIBridge";
import { AnalysisModule } from '@packages/cv-val/types/analysis-module';
import ModuleContainerItem from './PanelModuleContainerItem';

interface Props {
  modules: AnalysisModule[];
  data: any;
  currentFrame: number;
  onRemoveModule: (id: string) => void;
  onReorderModules?: (newModules: AnalysisModule[]) => void; // 순서 변경 콜백 추가
  direction?: 'horizontal' | 'vertical';
}

/**
 * PanelModuleContainer
 */
const PanelModuleContainer: React.FC<Props> = ({ 
  modules, 
  data, 
  currentFrame, 
  onRemoveModule,
  onReorderModules,
  direction = 'horizontal' 
}) => {
  // groups: string[][] -> [ [col1_item1, col1_item2], [col2_item1] ]
  const [groups, setGroups] = useState<string[][]>([]);
  const [layoutDirection, setLayoutDirection] = useState<'horizontal' | 'vertical'>(direction);
  const [draggedPos, setDraggedPos] = useState<{ gIdx: number; iIdx: number } | null>(null);
  const [dragOverPos, setDragOverPos] = useState<{ gIdx: number; iIdx: number } | null>(null);
  const [dropZone, setDropZone] = useState<'top' | 'bottom' | 'left' | 'right' | null>(null);

  // 방향(direction) 프로프가 변경될 때만 레이아웃 방향 동기화
  useEffect(() => {
    setLayoutDirection(direction);
  }, [direction]);

  // modules prop이 변경될 때 groups 상태와 동기화 (새 유닛은 항상 우측 끝에 추가)
  useEffect(() => {
    setGroups(prev => {
      const activeIds = new Set(modules.map(m => m.id));
      // 1. 사라진 모듈 제거
      let nextGroups = prev.map(g => g.filter(id => activeIds.has(id))).filter(g => g.length > 0);
      
      const existingIds = new Set(nextGroups.flat());
      // 2. 새로 추가된 모듈은 새로운 그룹으로 추가
      modules.forEach(m => {
        if (!existingIds.has(m.id)) {
          nextGroups.push([m.id]);
        }
      });
      return nextGroups;
    });
  }, [modules]);

  // ID로 모듈 객체 찾기 맵
  const moduleMap = useMemo(() => {
    return modules.reduce((acc, m) => ({ ...acc, [m.id]: m }), {} as Record<string, AnalysisModule>);
  }, [modules]);

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

  // 드래그 앤 드롭 정렬 로직
  const handleDragStart = (gIdx: number, iIdx: number) => setDraggedPos({ gIdx, iIdx });

  const handleDragOver = (e: React.DragEvent, gIdx: number, iIdx: number) => {
    e.preventDefault();
    if (draggedPos?.gIdx === gIdx && draggedPos?.iIdx === iIdx) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const { width, height } = rect;

    // 마우스 위치에 따라 가장 가까운 가장자리(Edge) 계산
    const distTop = y;
    const distBottom = height - y;
    const distLeft = x;
    const distRight = width - x;

    const minDist = Math.min(distTop, distBottom, distLeft, distRight);
    
    setDragOverPos({ gIdx, iIdx });
    if (minDist === distTop) setDropZone('top');
    else if (minDist === distBottom) setDropZone('bottom');
    else if (minDist === distLeft) setDropZone('left');
    else if (minDist === distRight) setDropZone('right');
  };

  const handleDrop = (targetGIdx: number, targetIIdx: number) => {
    if (!draggedPos || !dropZone) return;
    
    const newGroups = groups.map(g => [...g]);
    const movedId = newGroups[draggedPos.gIdx][draggedPos.iIdx];
    
    // 1. 원본 위치에서 제거
    newGroups[draggedPos.gIdx].splice(draggedPos.iIdx, 1);
    const cleanedGroups = newGroups.filter(g => g.length > 0);

    // 2. 새로운 위치 계산
    const isMainAxis = (layoutDirection === 'horizontal' && (dropZone === 'left' || dropZone === 'right')) ||
                       (layoutDirection === 'vertical' && (dropZone === 'top' || dropZone === 'bottom'));

    if (isMainAxis) {
      // 메인축 이동: 새로운 독립 그룹(Column/Row) 생성
      const insertIdx = (dropZone === 'right' || dropZone === 'bottom') ? targetGIdx + 1 : targetGIdx;
      cleanedGroups.splice(insertIdx, 0, [movedId]);
    } else {
      // 보조축 이동: 기존 그룹 내부로 편입 (VS Code의 분할 뷰)
      const groupToJoin = cleanedGroups.findIndex(g => g.includes(groups[targetGIdx][targetIIdx]));
      if (groupToJoin !== -1) {
        const insertIdx = (dropZone === 'bottom' || dropZone === 'right') ? targetIIdx + 1 : targetIIdx;
        cleanedGroups[groupToJoin].splice(insertIdx, 0, movedId);
      }
    }
    
    setGroups(cleanedGroups);
    // 부모에게 변경된 평면 순서 전달 (필요 시)
    onReorderModules?.(cleanedGroups.flat().map(id => moduleMap[id]));
    handleDragEnd();
  };

  const handleDragEnd = () => {
    setDraggedPos(null);
    setDragOverPos(null);
    setDropZone(null);
  };

  return (
    <Div 
      className="panel-module-container" 
       style={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', // 내부 Group이 공간을 꽉 채우도록 Flex 설정
        flexDirection: 'column',
        flex: 1, 
        overflow: 'hidden',
        minHeight: 0, // 부모로부터 할당받은 크기 이상으로 늘어나지 않도록 제한
        minWidth: 0
      }}
    >
      {/* 레이아웃 제어 핸들/버튼 (ModuleContainerItem 스타일 참고) */}
      <Div style={{
        position: 'absolute',
        top: '8px',
        right: '8px',
        zIndex: 100,
        display: 'flex',
        gap: '4px'
      }}>
        <button
          onClick={() => setLayoutDirection(prev => prev === 'horizontal' ? 'vertical' : 'horizontal')}
          style={{
            padding: '4px 8px',
            fontSize: '12px',
            backgroundColor: vars.box,
            color: vars.text,
            border: `1px solid ${vars.surface}`,
            borderRadius: '4px',
            cursor: 'pointer',
            opacity: 0.8,
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}
          title="레이아웃 방향 전환"
        >
          {layoutDirection === 'horizontal' ? '↕️ 세로로 보기' : '↔️ 가로로 보기'}
        </button>
      </Div>

      <Group 
        key={`${modules.length}-${layoutDirection}`} // 개수나 방향 변경 시 레이아웃 재계산
        orientation={layoutDirection} 
        id="cv-val-analysis-layout"
        style={{ flex: 1, height: '100%', width: '100%' }} // flex: 1을 추가하여 남은 공간 점유 강제
      >
        {groups.map((group, gIdx) => (
          <React.Fragment key={`group-${gIdx}`}>
            <Panel 
              defaultSize={100 / groups.length} 
              minSize={10} 
              style={{ position: 'relative', minHeight: 0, minWidth: 0 }}
            >
              <Group 
                orientation={layoutDirection === 'horizontal' ? 'vertical' : 'horizontal'}
                style={{ height: '100%', width: '100%' }} // 중첩된 그룹이 부모 패널을 꽉 채우도록 설정
              >
                {group.map((id, iIdx) => {
                  const module = moduleMap[id];
                  if (!module) return null;
                  return (
                    <React.Fragment key={id}>
                      <Panel 
                        defaultSize={100 / group.length} // 초기 높이 비율 설정
                        minSize={10}
                        style={{ position: 'relative', minHeight: 0, minWidth: 0 }} // 콘텐츠에 의한 확장 방지
                        onDragOver={(e) => handleDragOver(e, gIdx, iIdx)}
                        onDrop={() => handleDrop(gIdx, iIdx)}
                        onDragLeave={() => setDropZone(null)}
                      >
                        {dragOverPos?.gIdx === gIdx && dragOverPos?.iIdx === iIdx && dropZone && (
                          <Div style={{
                            position: 'absolute',
                            top: dropZone === 'bottom' ? '50%' : 0,
                            left: dropZone === 'right' ? '50%' : 0,
                            width: (dropZone === 'left' || dropZone === 'right') ? '50%' : '100%',
                            height: (dropZone === 'top' || dropZone === 'bottom') ? '50%' : '100%',
                            backgroundColor: vars.primary,
                            opacity: 0.2,
                            zIndex: 60,
                            pointerEvents: 'none',
                          }} />
                        )}
                        <ModuleContainerItem
                          module={module}
                          data={data}
                          currentFrame={currentFrame}
                          onRemove={onRemoveModule}
                          onDragStart={() => handleDragStart(gIdx, iIdx)}
                          onDragEnd={handleDragEnd}
                          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, margin: 0, borderRadius: 0 }}
                        />
                      </Panel>
                      {iIdx < group.length - 1 && <Separator className="panel-resizer" />}
                    </React.Fragment>
                  );
                })}
              </Group>
            </Panel>
            {gIdx < groups.length - 1 && (
              <Separator className="panel-resizer" />
            )}
          </React.Fragment>
        ))}
      </Group>

      <style>{`
        .panel-module-container {
          background-color: ${vars.box};
        }
        .panel-resizer {
          background-color: transparent;
          transition: background-color 0.2s ease;
          position: relative;
          z-index: 10;
        }
        .panel-resizer[data-panel-group-direction="horizontal"] {
          width: 6px;
          height: 100%;
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