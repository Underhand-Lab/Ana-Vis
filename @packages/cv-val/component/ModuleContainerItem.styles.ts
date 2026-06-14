import React from 'react';
import vars from '@shared/components/ui-brick/variables';

export const moduleItemStyles: { [key: string]: React.CSSProperties } = {
  card: {
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
    overflow: 'hidden',
    border: '1px solid',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40px',
    zIndex: 30,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 15px',
    opacity: 0,
    pointerEvents: 'none',
    transition: 'opacity 0.2s ease-in-out',
  },
  headerVisible: {
    opacity: 1,
    pointerEvents: 'auto',
  },
  iconButton: {
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    color: 'white',
    fontSize: '16px',
  },
  sidePanel: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    padding: '20px',
    zIndex: 20,
    overflowY: 'auto',
    borderLeft: '1px solid rgba(255,255,255,0.3)',
    color: '#222',
  }
};