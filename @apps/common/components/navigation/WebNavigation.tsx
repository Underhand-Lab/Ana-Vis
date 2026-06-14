import { vars } from '@shared/bridges/UIBridge';
import React from 'react';

export interface NavButton {
    name: string;
    action: () => void;
}

interface WebNavigationProps {
    fileButtons?: NavButton[];
    toolButtons?: any[];
}

const WebNavigation: React.FC<WebNavigationProps> = ({ fileButtons = [], toolButtons = [] }) => {

    const navStyle: React.CSSProperties & { WebkitAppRegion?: string } = {
        position: 'sticky',
        top: 0,
        width: '100%',
        maxWidth: '100vw',
        boxSizing: 'border-box',
        backgroundColor: vars.secondary,
        color: '#aaaaaa',
        fontSize: '15px',
        margin: 0,
        zIndex: 2000,
        transition: 'transform 0.5s ease',
        padding: '10px 0',
        WebkitAppRegion: 'none',
        overflow: 'hidden',
        borderBottom: 'none',
    };

    return (
        <nav style={navStyle}>
            <div style={{
                padding: '0 20px',
                width: '100%',
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'nowrap',
                gap: '50px'
            }}>
                <style>
                    {`.hide-scrollbar::-webkit-scrollbar { display: none; }`}
                </style>
                <ul style={{ display: 'flex', gap: '8px', listStyle: 'none', padding: 0, margin: 0, flexShrink: 0 }}>
                    <li style={{ margin: 0 }}>
                        CV-Val
                    </li>
                </ul>

                <div
                    className="hide-scrollbar"
                    style={{
                        flex: 1,
                        minWidth: 0,
                        overflowX: 'auto',
                        display: 'flex',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                        WebkitMaskImage: 'linear-gradient(to right, transparent, black 30px, black calc(100% - 30px), transparent)',
                        maskImage: 'linear-gradient(to right, transparent, black 30px, black calc(100% - 30px), transparent)',
                        margin: '0 -30px',
                        padding: '0 30px'
                    }}
                >
                    <ul style={{ display: 'flex', gap: '8px', listStyle: 'none', padding: 0, margin: '0 0 0 auto', width: 'max-content', flexShrink: 0 }}>
                        {fileButtons.map((btn) => (
                            <li key={btn.name} style={{ margin: 0 }}>
                                <button
                                    onClick={btn.action}
                                    style={{ padding: '2px 10px', whiteSpace: 'nowrap', fontFamily: vars.font  }}
                                >
                                    {btn.name}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </nav>
    );
};

export default WebNavigation;
