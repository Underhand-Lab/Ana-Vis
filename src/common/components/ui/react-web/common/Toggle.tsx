import React, { useState } from 'react';
import { Div } from '@common/bridges/UIBridge';

interface ToggleProps {
    title: string;
    children: React.ReactNode;
}

export const Toggle: React.FC<ToggleProps> = ({ title, children }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Div style={{ marginBottom: '10px', width: '100%', boxSizing: 'border-box' }}>
            <Div 
                onClick={() => setIsOpen(!isOpen)}
                style={{ 
                    padding: '8px 0', 
                    cursor: 'pointer', 
                    fontWeight: 'bold', 
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    userSelect: 'none'
                }}
            >
                <span style={{ textAlign: 'left' }}>{title}</span>
                <span style={{ fontSize: '10px' }}>{isOpen ? '▲' : '▼'}</span>
            </Div>
            {isOpen && (
                <Div style={{ padding: '10px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {children}
                </Div>
            )}
        </Div>
    );
};

export default Toggle;