import React from 'react';
import { Div, vars } from "@shared/bridges/UIBridge";

export interface PanelGroupProps<T> {
  cIdx: number;
  rIdx: number;
  group: string[];
  itemsMap: Record<string, T>;
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onAddItem?: () => void;
  onRemoveItem: (id: string) => void;
  renderItem: (item: T, handlers: any) => React.ReactNode;
  renderTabLabel?: (item: T, isActive: boolean) => React.ReactNode;
  dragOverPos: { cIdx: number, rIdx: number } | null;
  dropZone: string | null; // This is still needed for overlay logic
  onPanelDragOver: (cIdx: number, rIdx: number, e: React.DragEvent, zone?: 'center') => void;
  onPanelDrop: (cIdx: number, rIdx: number) => void;
  onPanelDragLeave: () => void;
  onTabDragStart: (iIdx: number) => void;
  onDragEnd: () => void;
}

export function PanelGroup<T extends { id: string }>({
  cIdx, rIdx, group, itemsMap, activeTabId, onSelectTab, onAddItem, onRemoveItem, renderItem, renderTabLabel,
  dragOverPos, dropZone, onPanelDragOver, onPanelDrop, onPanelDragLeave, onTabDragStart, onDragEnd
}: PanelGroupProps<T>) {

  return (
    <Div 
      style={{ 
        display: 'flex', flexDirection: 'column', width: '100%', height: '100%', 
        backgroundColor: vars.box, border: `none`, position: 'relative',
        minWidth: 0, minHeight: 0, boxSizing: 'border-box'
      }}
      onDragOver={(e) => onPanelDragOver(cIdx, rIdx, e)}
      onDrop={() => onPanelDrop(cIdx, rIdx)}
      onDragLeave={onPanelDragLeave}
    >
      {/* Tab Bar: 탭 영역 드래그 시 stopPropagation으로 'center' 드롭 유도 */}
      <Div 
        style={{ 
          display: 'flex', 
          backgroundColor: vars.background,
          borderBottom: `1px solid ${vars.surface}`,
          zIndex: 100, 
          minHeight: '32px',
          userSelect: 'none',
          flexDirection: 'row'
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onPanelDragOver(cIdx, rIdx, e, 'center');
        }}
      >
        {/* Scrollable Tab List */}
        <Div 
          style={{ 
            display: 'flex', 
            overflowX: 'auto',
            minWidth: 0,
            scrollbarWidth: 'none',
            flexDirection: 'row'
          }}
        >
          {group.map((id, iIdx) => {
            const item = itemsMap[id];
            // itemsMap이 갱신되었지만 groups가 아직 정리되지 않은 타이밍에
            // item이 undefined인 경우 해당 탭을 렌더링하지 않아 깜빡임 방지
            if (!item) return null;
            const isActive = activeTabId === id;
            return (
              <Div
                key={id}
                draggable
                onDragStart={() => onTabDragStart(iIdx)}
                onDragEnd={onDragEnd}
                onClick={() => onSelectTab(id)}
                style={{
                  padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                  backgroundColor: isActive ? vars.box : 'transparent',
                  borderRight: `1px solid ${vars.surface}`,
                  borderTop: isActive ? `2px solid ${vars.primary}` : '2px solid transparent',
                  minWidth: 'fit-content', userSelect: 'none', transition: 'all 0.1s',
                  opacity: isActive ? 1 : 0.6
                }}
              >
                {renderTabLabel ? (
                  renderTabLabel(item, isActive)
                ) : (
                  <span style={{ fontSize: '12px', color: vars.text, fontWeight: isActive ? 'bold' : 'normal' }}>
                    {(item as any).title ?? ((item as any).name || id)}
                  </span>
                )}
                <Div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemoveItem(id); }}
                    style={{ background: 'none', border: 'none', color: vars.text, cursor: 'pointer', padding: '2px', fontSize: '10px', opacity: 0.6 }}
                  >✕</button>
                </Div>
              </Div>
            );
          })}

        </Div>

        {onAddItem && (
          <Div
            onClick={(e) => { e.stopPropagation(); onAddItem(); }}
            style={{
              flexShrink: 0,
              padding: '6px 14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'transparent',
              borderLeft: `1px solid ${vars.surface}`,
              color: vars.text,
              opacity: 0.6,
              fontSize: '16px',
              userSelect: 'none',
              transition: 'opacity 0.1s'
            }}
          >
            +
          </Div>
        )}
      </Div>

      {/* Content Area */}
      <Div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {group.map((id) => {
          const item = itemsMap[id];
          if (!item || activeTabId !== id) return null;
          return (
            <React.Fragment key={id}>
              {renderItem(item, { 
                onDragStart: () => {}, 
                onDragEnd
              })}
            </React.Fragment>
          );
        })}

        {/* Drop Overlay */}
        {dragOverPos?.cIdx === cIdx && dragOverPos?.rIdx === rIdx && dropZone && (
          <DropOverlay zone={dropZone} />
        )}
      </Div>
    </Div>
  );
}

function DropOverlay({ zone }: { zone: string }) {
  const style: React.CSSProperties = {
    position: 'absolute',
    backgroundColor: vars.primary,
    opacity: 0.2,
    zIndex: 100,
    pointerEvents: 'none',
    transition: 'all 0.15s ease-out'
  };

  switch (zone) {
    case 'left':
      return <Div style={{ ...style, top: 0, left: 0, bottom: 0, width: '50%' }} />;
    case 'right':
      return <Div style={{ ...style, top: 0, right: 0, bottom: 0, width: '50%' }} />;
    case 'top':
      return <Div style={{ ...style, top: 0, left: 0, right: 0, height: '50%' }} />;
    case 'bottom':
      return <Div style={{ ...style, bottom: 0, left: 0, right: 0, height: '50%' }} />;
    default: // center
      return <Div style={{ ...style, top: 0, left: 0, right: 0, bottom: 0 }} />;
  }
}