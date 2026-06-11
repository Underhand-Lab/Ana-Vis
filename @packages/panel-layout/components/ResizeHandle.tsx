import React, { useState } from 'react';
import { Separator } from 'react-resizable-panels';
import { Div, vars } from "@shared/bridges/UIBridge";

interface ResizeHandleProps {
  direction: 'horizontal' | 'vertical';
}

export const ResizeHandle: React.FC<ResizeHandleProps> = ({ direction }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const isHorizontal = direction === 'horizontal';

  return (
    <Separator
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onPointerDown={() => setIsActive(true)}
      onPointerUp={() => setIsActive(false)}
      style={{
        height: isHorizontal ? '8px' : '',
        width: isHorizontal ? '100%' : '8px',
        backgroundColor: 'transparent',
        cursor: isHorizontal ? 'row-resize' : 'col-resize',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        outline: 'none'
      }}
    >
      <Div style={{
        height: isHorizontal ? (isHovered || isActive ? '4px' : '2px') : '100%',
        width: isHorizontal ? '100%' : (isHovered || isActive ? '4px' : '2px'),
        backgroundColor: isHovered || isActive ? vars.primary : vars.surface,
        transition: isActive ? 'none' : 'all 0.15s'
      }} />
    </Separator>
  );
};
