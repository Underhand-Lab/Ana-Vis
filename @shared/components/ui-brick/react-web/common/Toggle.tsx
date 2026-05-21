import React, { useState } from 'react';
import { Div } from '@shared/bridges/UIBridge';

interface ToggleProps {
    title: string;
    children: React.ReactNode;
}

export const Toggle: React.FC<ToggleProps> = ({ title, children }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Div style={{ marginBottom: '10px', width: '100%', boxSizing: 'border-box', minWidth: 0 }}>
            <Div
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    userSelect: 'none',
                    gap: '10px',
                }}
            >
                <span style={{ textAlign: 'left' }}>{title}</span>
                <span style={{ fontSize: '10px' }}>{isOpen ? '▲' : '▼'}</span>
            </Div>

            <Div style={{
                display: 'grid',
                gridTemplateRows: isOpen ? '1fr' : '0fr',
                transition: 'grid-template-rows 0.3s ease-out, opacity 0.3s ease-out',
                opacity: isOpen ? 1 : 0,
                pointerEvents: isOpen ? 'auto' : 'none',
            }}
            >
                <Div style={{ overflow: 'hidden', minHeight: '0px' }}>
                    <Div style={{
                        padding: '10px 0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                    }}>
                        {children}
                    </Div>
                </Div>
            </Div>
        </Div>
    );
};

export default Toggle;