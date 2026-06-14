import React, { forwardRef } from 'react';
import { Panel, Group, Layout } from 'react-resizable-panels';
import { Div, vars } from "@shared/bridges/UIBridge";
import { 
  useGenericPanelLayout, 
  GenericPanelLayoutHandle, 
  LayoutItem,
  PanelLayout,
  SerializedPanelLayout 
} from '../hooks/useGenericPanelLayout';
import { ResizeHandle } from './ResizeHandle';
import { GenericPanelRowContent } from './GenericPanelRowContent';
export type { 
  GenericPanelLayoutHandle, 
  LayoutItem, 
  PanelLayout, 
  SerializedPanelLayout 
};

export interface GenericPanelLayoutProps<T> {
  items: T[];
  renderItem: (
    item: T,
    id: string, // 내부에서 발급한 ID를 외부로 전달
    handlers: { onDragStart: () => void; onDragEnd: () => void }
  ) => React.ReactNode;
  renderTabLabel?: (item: T, isActive: boolean, id: string) => React.ReactNode;
  onItemInit?: (item: T, id: string) => void;
  onItemCleanup?: (item: T, id: string) => void;
  getItemDeps?: (item: T, id: string) => any[];
  onRemoveItem?: (item: T, id: string) => void;
  onReorderItems?: (newItems: T[]) => void;
  onAddItem?: () => Promise<T | undefined>;
  emptyPlaceholder?: React.ReactNode;
  labels?: {
    toVertical: string;
    toHorizontal: string;
  };
  maxColumns?: number;
  maxRows?: number;
  layout?: SerializedPanelLayout;
  onLayoutChange?: (layoutJson: PanelLayout<T>) => void;
  onLayoutChangeEnd?: (layoutJson: PanelLayout<T>) => void;
}

/**
 * GenericPanelLayout은 도메인 데이터 T를 내부 관리용 ID와 함께 래핑하여 레이아웃을 구성합니다.
 */
function GenericPanelLayoutComponent<T>(
  props: GenericPanelLayoutProps<T>, 
  ref: React.ForwardedRef<GenericPanelLayoutHandle<T>>
) {
  const layoutResult = useGenericPanelLayout(props, ref);

  const {
    groups,
    colSizes,
    setColSizes,
    rowSizesMap,
    isColChanged,
    lastStructureRef,
    handleResizeEnd,
    setRowSizesMap,
  } = layoutResult;

  return (
    <Div className="generic-panel-container" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', position: 'relative', backgroundColor: vars.background, boxSizing: 'border-box' }}>
      <Group 
        orientation="horizontal" 
        key={`h-group-${groups.length}`}
        style={{ flex: 1 }} 
        onLayoutChange={setColSizes}
      >
        {groups.flatMap((column, cIdx) => {
          const isRowChanged = column.length !== (lastStructureRef.current.rowCounts[cIdx] || 0);
          const colDefaultSize = 100 / groups.length;
          const savedColSize = colSizes[`col-${cIdx}`];
          const colElements: React.ReactNode[] = [
            <Panel 
              key={`col-${cIdx}`} 
              id={`col-${cIdx}`} 
              defaultSize={isColChanged && !savedColSize ? colDefaultSize : (savedColSize ?? colDefaultSize)} 
              minSize={20}
            >
              <Group 
                key={`v-group-${cIdx}-${column.length}`}
                orientation="vertical" 
                onLayoutChange={(sizes: Layout) => setRowSizesMap(prev => ({ ...prev, [cIdx]: sizes }))}
              >
                {column.flatMap((row, rIdx) => {
                  const rowElements: React.ReactNode[] = [
                    <Panel 
                      key={row.id} 
                      id={row.id} 
                      defaultSize={isRowChanged ? (100 / column.length) : (rowSizesMap[cIdx]?.[row.id] ?? (100 / column.length))} 
                      minSize={15}
                    >
                      <GenericPanelRowContent
                        cIdx={cIdx}
                        rIdx={rIdx}
                        row={row}
                        layout={layoutResult}
                        externalProps={props}
                      />
                    </Panel>
                  ];
                  if (rIdx < column.length - 1) {
                    rowElements.push(
                      <ResizeHandle 
                        key={`sep-row-${row.id}`} 
                        direction="horizontal" 
                        onDraggingChange={(isDragging) => !isDragging && handleResizeEnd()}
                      />
                    );
                  }
                  return rowElements;
                })}
              </Group>
            </Panel>
          ];
          if (cIdx < groups.length - 1) {
            colElements.push(
              <ResizeHandle 
                key={`sep-col-${cIdx}`} 
                direction="vertical" 
                onDraggingChange={(isDragging) => !isDragging && handleResizeEnd()}
              />
            );
          }
          return colElements;
        })}
      </Group>
    </Div>
  );
}

export const GenericPanelLayout = forwardRef(GenericPanelLayoutComponent) as <T>(
  props: GenericPanelLayoutProps<T> & { ref?: React.Ref<GenericPanelLayoutHandle<T>> }
) => React.ReactElement;