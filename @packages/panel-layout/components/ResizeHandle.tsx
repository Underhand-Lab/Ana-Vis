import React, { useState } from 'react';
import { Separator } from 'react-resizable-panels';
import { Div, vars } from "@shared/bridges/UIBridge";

interface ResizeHandleProps {
  direction: 'horizontal' | 'vertical';
}

export const ResizeHandle: React.FC<ResizeHandleProps> = ({ direction }) => {
  const [isHovered, setIsHovered] = useState(false);
  const isHorizontal = direction === 'horizontal';

  return (
    <Separator
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        height: isHorizontal ? '12px' : undefined, // 터치 영역 확장 (시각적으론 2px 유지)
        width: isHorizontal ? '100%' : '12px',
        margin: isHorizontal ? '-5px 0' : '0 -5px', // 실제 레이아웃 영향 최소화
        backgroundColor: 'transparent',
        cursor: isHorizontal ? 'row-resize' : 'col-resize',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000, // 탭 바(100)보다 확실히 높게 설정하여 터치/클릭 차단 방지
        outline: 'none',
        touchAction: 'none', // 리사이즈 중 브라우저 스크롤 방지
        pointerEvents: 'auto' // 이벤트를 확실히 수신
      }}
    >
      <Div style={{
        height: isHorizontal ? '2px' : '100%', // 시각적 실선 두께
        width: isHorizontal ? '100%' : '2px',
        backgroundColor: isHovered ? vars.primary : '',
        transition: 'all 0.15s'
      }} />
    </Separator>
  );
};
