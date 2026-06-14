import { useState, useCallback, useEffect } from 'react';
import { Layout } from 'react-resizable-panels';
import { SerializedPanelLayout } from './useGenericPanelLayout';
import { PanelRow } from './usePanelGroups';

export const extractSizes = (layoutObj: SerializedPanelLayout | undefined) => {
  const colSizes: Layout = {};
  const rowSizesMap: Record<number, Layout> = {};
  if (layoutObj?.groups) {
    layoutObj.groups.forEach((col, cIdx) => {
      if (col[0]?.width !== undefined) colSizes[`col-${cIdx}`] = col[0].width;
      const rowLayout: Layout = {};
      col.forEach((row) => {
        if (row.height !== undefined) rowLayout[row.id] = row.height;
      });
      rowSizesMap[cIdx] = rowLayout;
    });
  }
  return { colSizes, rowSizesMap };
};

export function usePanelSizeManager(
  layout: SerializedPanelLayout | undefined,
  groups: PanelRow[][],
  dropZone: 'top' | 'bottom' | 'left' | 'right' | 'center' | null,
  originalOnPanelDrop: (cIdx: number, rIdx: number) => void
) {
  const [colSizes, setColSizes] = useState<Layout>(() => extractSizes(layout).colSizes);
  const [rowSizesMap, setRowSizesMap] = useState<Record<number, Layout>>(() => extractSizes(layout).rowSizesMap);

  const onPanelDrop = useCallback((cIdx: number, rIdx: number) => {
    if (dropZone && dropZone !== 'center') {
      if (dropZone === 'left' || dropZone === 'right') {
        const currentColWidths: number[] = [];
        for (let i = 0; i < groups.length; i++) {
          currentColWidths.push(colSizes[`col-${i}`] ?? (100 / groups.length));
        }
        const targetWidth = currentColWidths[cIdx];
        const half = targetWidth / 2;
        const nextWidths = [...currentColWidths];
        nextWidths[cIdx] = half;
        nextWidths.splice(dropZone === 'left' ? cIdx : cIdx + 1, 0, half);
        
        const nextColSizes: Layout = {};
        nextWidths.forEach((w, i) => {
          nextColSizes[`col-${i}`] = w;
        });
        setColSizes(nextColSizes);
      } else {
        const currentColRows = groups[cIdx];
        if (currentColRows && currentColRows[rIdx]) {
          const targetRow = currentColRows[rIdx];
          const currentRowHeights: Layout = rowSizesMap[cIdx] || {};
          
          const heights: Layout = {};
          currentColRows.forEach(row => {
            heights[row.id] = currentRowHeights[row.id] ?? (100 / currentColRows.length);
          });
          const targetHeight = heights[targetRow.id];
          const half = targetHeight / 2;
          
          setRowSizesMap(prev => ({
            ...prev,
            [cIdx]: {
              ...heights,
              [targetRow.id]: half,
              'pending-split-size': half
            }
          }));
        }
      }
    }
    originalOnPanelDrop(cIdx, rIdx);
  }, [dropZone, originalOnPanelDrop, groups, colSizes, rowSizesMap]);

  // 레이아웃 정보 주입 시 상태 동기화
  const [lastInjectedLayout, setLastInjectedLayout] = useState<SerializedPanelLayout | undefined>(layout);
  useEffect(() => {
    if (layout !== lastInjectedLayout) {
      setLastInjectedLayout(layout);
      const { colSizes: newCols, rowSizesMap: newRows } = extractSizes(layout);
      setColSizes(newCols);
      setRowSizesMap(newRows);
    }
  }, [layout, lastInjectedLayout]);

  // 초기 로드 싱크
  useEffect(() => {
    if (layout?.groups) {
      const { colSizes: c, rowSizesMap: r } = extractSizes(layout);
      setColSizes(c);
      setRowSizesMap(r);
    }
  }, [layout]);

  return {
    colSizes,
    setColSizes,
    rowSizesMap,
    setRowSizesMap,
    onPanelDrop,
    updateFromLayout: (layout: SerializedPanelLayout) => {
      const { colSizes: c, rowSizesMap: r } = extractSizes(layout);
      setColSizes(c);
      setRowSizesMap(r);
    }
  };
}