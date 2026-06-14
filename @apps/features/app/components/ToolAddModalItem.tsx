import React, { useState } from 'react';
import { Div, vars } from '@shared/bridges/UIBridge';

interface ToolAddModalItemProps {
  id: string;
  label: string;
  type: string;
  isSystem: boolean;
  onClick: () => void;
}

const ToolAddModalItem: React.FC<ToolAddModalItemProps> = ({ id, label, type, isSystem, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        padding: '10px 12px',
        cursor: 'pointer',
        userSelect: 'none',
        borderBottom: `1px solid ${vars.primary}`,
        backgroundColor: isHovered ? `${vars.primary}10` : 'transparent',
        transition: 'all 0.2s ease',
        boxSizing: 'border-box',
        width: '100%', // 1열 전체 너비 사용
        flexGrow: 0, // 홀수개일 때 마지막 아이템이 늘어나지 않도록 고정
        flexShrink: 0,
        flexBasis: '100%' // flex 기반 레이아웃을 위한 기준 너비
      }}
    >
      {/* 텍스트 영역 (2줄 스타일) */}
      <Div style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', flex: 1, minWidth: 0, gap: '8px' }}>
        <span style={{ 
          fontWeight: '600', fontSize: '13px', color: vars.text,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          flexShrink: 0 // Prevent label from shrinking too much
        }}>{label}</span>
        <span style={{ 
          fontSize: '10px', opacity: 0.6, color: vars.text,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          flex: 1, // Allow type/id to take remaining space and truncate if needed
          textAlign: 'right'
        }}>{type} • {id}</span>
      </Div>
    </Div>
  );
};

export default ToolAddModalItem;