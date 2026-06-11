import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { Div, Button, vars } from '@shared/bridges/UIBridge';

interface VisualizerListProps {
  tools: Array<{ id: string, name: string, Component: React.ComponentType<any>, props?: Record<string, any> }>;
  data: any;
  onRemove: (id: string) => void;
  toolOptions?: Array<{ name: string, Component: React.ComponentType<any>, props?: Record<string, any> }>;
  onAddTool?: (option: { name: string, Component: React.ComponentType<any>, props?: Record<string, any> }) => void;
}

export const VisualizerList: React.FC<VisualizerListProps> = ({ tools = [], data, onRemove, toolOptions, onAddTool }) => {
  // 초기 탭 ID를 첫 번째 도구의 ID로 즉시 설정하여 불필요한 재렌더링 방지
  const [activeTabId, setActiveTabId] = useState<string | null>(() =>
    (Array.isArray(tools) && tools.length > 0) ? tools[0].id : null
  );
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null); // 탭 목록 스크롤을 위한 ref
  // 이전 도구 목록의 길이를 추적하여 도구가 새로 추가되었는지 확인합니다.
  const prevToolsRef = useRef(tools); // 이전 tools 배열을 저장

  // 메뉴 외부 클릭 시 닫기 처리
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (addMenuRef.current && event.target && !addMenuRef.current.contains(event.target as Node)) {
        setIsAddMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 도구 목록이 변경될 때 활성 탭 상태를 동기화합니다.
  useEffect(() => {
    const prevTools = prevToolsRef.current;

    if (!tools || tools.length === 0) {
      if (activeTabId !== null) setActiveTabId(null);
      prevToolsRef.current = [];
      return;
    }

    // 1. 도구가 새로 추가된 경우 (목록의 길이가 늘어남)
    if (tools.length > prevTools.length) {
      // 가장 최근에 추가된 도구(마지막 요소)를 활성화합니다.
      setActiveTabId(tools[tools.length - 1].id);
    } else if (tools.length < prevTools.length) {
      // 2. 기존 활성 탭이 삭제된 경우 처리
      const currentExists = tools.some(t => t.id === activeTabId);
      if (activeTabId !== null && !currentExists) {
        // 활성 탭이 삭제됨. 이전 위치를 찾아 인접 탭 선택
        const removedIndex = prevTools.findIndex(t => t.id === activeTabId);
        // 삭제된 탭의 바로 왼쪽 탭 선택 (첫 번째 탭이었다면 새로운 0번인 오른쪽 탭 선택)
        const nextIndex = Math.max(0, removedIndex - 1);
        if (tools[nextIndex]) {
          setActiveTabId(tools[nextIndex].id);
        }
      }
    } else if (activeTabId === null && tools.length > 0) {
      setActiveTabId(tools[0].id);
    }

    prevToolsRef.current = tools;
  }, [tools, activeTabId]);

  // 활성 탭이 변경될 때 해당 탭 버튼을 가시 영역으로 스크롤합니다.
  useEffect(() => {
    if (activeTabId && scrollRef.current) {
      const activeTabElement = scrollRef.current.querySelector(`[data-tab-id="${activeTabId}"]`) as HTMLElement;
      if (activeTabElement) {
        // 탭 바에서 현재 활성화된 탭이 잘리지 않도록 스크롤 이동
        activeTabElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeTabId]);

  // 탭 스크롤 함수
  const scrollTabs = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth / 2; // 탭 너비의 절반만큼 스크롤
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // 현재 활성화된 도구 찾기 (상태 업데이트 지연 방지를 위해 tools가 있으면 즉시 첫 번째 도구 반환)
  const activeTool = tools.find(t => t.id === activeTabId) || (tools.length > 0 ? tools[0] : undefined);

  // 컴포넌트 타입 추출
  const ActiveComponent = activeTool?.Component as any;

  return (
    <Div style={{ display: 'flex', flexDirection: 'column', flex: 1, border: '1px solid', borderColor: vars.surface, borderRadius: '8px', overflow: 'hidden' }}>
      {/* 탭 바 영역: 전체 레이아웃 (overflow를 제거하여 메뉴 짤림 방지) */}
      <Div style={{
        display: 'flex',
        flexDirection: 'row',
        backgroundColor: vars.background,
        borderBottom: '1px solid',
        borderColor: vars.surface,
        alignItems: 'center',
      }}>
        {/* 탭 목록: 실제 스크롤이 발생하는 영역 */}
        <Div ref={scrollRef} style={{
          display: 'flex',
          flexDirection: 'row',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          flex: 1,
          alignItems: 'center'
        }}>
          {Array.isArray(tools) && tools.map((tool) => (
            <Div
              key={tool.id}
              data-tab-id={tool.id}
              onClick={() => setActiveTabId(tool.id)}
              style={{
                padding: '5px 5px 5px 20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                backgroundColor: activeTabId === tool.id ? vars.box : 'transparent',
                borderRight: `1px solid ${vars.surface}`,
                borderTop: activeTabId === tool.id ? `3px solid ${vars.primary}` : '3px solid transparent',
                minWidth: 'fit-content',
                transition: 'background-color 0.1s',
                userSelect: 'none'
              }}
            >
              <span style={{ fontSize: '14px', color: vars.text, fontWeight: activeTabId === tool.id ? 'bold' : 'normal' }}>
                {tool.name}
              </span>
              <button
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onRemove(tool.id);
                }}
                style={{
                  padding: '2px 6px',
                  fontSize: '12px',
                  background: 'transparent',
                  boxShadow: 'none',
                  border: 'none',
                  color: vars.text,
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </Div>
          ))}
        </Div>

        {/* 도구 추가 버튼 (+) */}
        {toolOptions && onAddTool && (
          <Div style={{ position: 'relative', borderLeft: `1px solid ${vars.surface}` }} ref={addMenuRef}>
            <Button
              onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
              noHover
              style={{
                background: 'transparent',
                border: 'none',
                boxShadow: 'none',
                fontSize: '18px',
                cursor: 'pointer',
                color: vars.text,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              +
            </Button>
            {isAddMenuOpen && (
              <Div style={{
                // 드롭다운 메뉴가 탭 바를 벗어나지 않도록 zIndex 설정
                position: 'absolute',
                top: '100%',
                right: 0,
                zIndex: 1000,
                backgroundColor: vars.box,
                border: '1px solid',
                borderColor: vars.surface,
                borderRadius: '4px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                minWidth: '150px',
                display: 'flex',
                flexDirection: 'column',
                padding: '5px 0'
              }}>
                {toolOptions.map(option => (
                  <Div
                    key={option.name}
                    onClick={() => {
                      onAddTool(option);
                      setIsAddMenuOpen(false);
                    }}
                    style={{
                      padding: '10px 15px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      color: vars.text,
                      whiteSpace: 'nowrap',
                      borderBottom: '1px solid',
                      borderColor: vars.surface,
                    }}
                  >
                    {option.name}
                  </Div>
                ))}
              </Div>
            )}
          </Div>
        )}
      </Div>

      {/* 컨텐츠 표시 영역 */}
      <Div style={{ flex: 1, overflowY: 'auto', backgroundColor: vars.box, padding: '24px' }}>
        <Div style={{ }}>
          {(() => {
            if (!activeTool || !ActiveComponent) {
              return (
                <Div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: vars.text, flexDirection: 'column', gap: '10px' }}>
                  <p>표시할 분석 도구가 없습니다.</p>
                  <p style={{ fontSize: '12px' }}>상단에서 도구를 추가하여 분석을 시작하세요.</p>
                </Div>
              );
            }

            // 1. 컴포넌트 형식 확인
            const type = typeof ActiveComponent;

            // 2. 이미 생성된 React 엘리먼트인 경우 그대로 렌더링 (또는 multi-react 대응)
            const isReactElement = React.isValidElement(ActiveComponent) ||
              (type === 'object' && ActiveComponent !== null && ActiveComponent.$$typeof?.toString().includes('react.element'));

            if (isReactElement) {
              return ActiveComponent;
            }

            // 3. 컴포넌트 타입(함수, 클래스, 또는 memo/forwardRef 객체)인 경우 태그로 렌더링, props 전달
            const isComponentType =
              type === 'function' ||
              type === 'string' ||
              (type === 'object' && ActiveComponent !== null && ActiveComponent.$$typeof);

            if (isComponentType) {
              return <ActiveComponent data={data} {...(activeTool.props || {})} />;
            }

            // 4. 예외 상황 처리
            return (
              <Div style={{ color: vars.text, textAlign: 'center' }}>
                오류: 유효하지 않은 분석 도구 컴포넌트 형식입니다.
              </Div>
            );
          })()}
        </Div>
      </Div>
    </Div>
  );
};