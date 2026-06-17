import { vars, Button, Div } from '@shared/bridges/UIBridge';
import React from 'react';

export interface NavButton {
    name: string;
    action: () => void;
}

interface MobileNavigationProps {
    fileButtons?: NavButton[];
    toolButtons?: any[];
}

const MobileNavigation: React.FC<MobileNavigationProps> = ({ fileButtons = [], toolButtons = [] }) => {

    const navStyle: React.CSSProperties & { WebkitAppRegion?: string } = {
        position: 'sticky',
        top: 0,
        width: '100%',
        maxWidth: '100vw',
        boxSizing: 'border-box',
        backgroundColor: vars.secondary,
        color: '#aaaaaa',
        fontSize: '14px',
        margin: 0,
        zIndex: 2000,
        transition: 'transform 0.5s ease',
        // iOS Safe Area 대응: 기기 상단 여백에 맞춰 패딩 자동 조절
        padding: '24px 4px 0',
        WebkitAppRegion: 'none',
        overflow: 'visible', // 버튼 터치 영역 확보를 위해 hidden 해제
        borderBottom: `1px solid ${vars.surface}`
    } as const;

    return (
        <nav style={navStyle}>
            <div style={{
                padding: '0 15px',
                width: '100%',
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'nowrap',
                gap: '10px',
                pointerEvents: 'auto'
            }}>
                <style>
                    {`.hide-scrollbar::-webkit-scrollbar { display: none; }`}
                </style>
                <ul style={{ display: 'flex', gap: '8px', listStyle: 'none', padding: 0, margin: 0, flexShrink: 0 }}>
                    <li style={{ margin: 0, fontWeight: 'bold', color: vars.text }}>
                        CV-Val
                    </li>
                </ul>

                <Div
                    className="hide-scrollbar"
                    style={{
                        flex: 1,
                        minWidth: 0,
                        overflowX: 'auto',
                        display: 'flex',
                        WebkitMaskImage: 'linear-gradient(to right, transparent, black 20px, black calc(100% - 20px), transparent)',
                        maskImage: 'linear-gradient(to right, transparent, black 20px, black calc(100% - 20px), transparent)',
                        padding: '4px 20px',
                        WebkitOverflowScrolling: 'touch',
                        touchAction: 'pan-x',
                        pointerEvents: 'auto'
                    }}
                >
                    <ul style={{ display: 'flex', gap: '6px', listStyle: 'none', padding: 0, margin: '0 0 0 auto', width: 'max-content', flexShrink: 0 }}>
                        {fileButtons.map((btn) => (
                            <li key={btn.name} style={{ margin: 0 }}>
                                <button
                                    onClick={btn.action}
                                    style={{ padding: '2px 10px', whiteSpace: 'nowrap', fontFamily: vars.font  }}                                                                    
                                >{btn.name}</button>
                            </li>
                        ))}
                    </ul>
                </Div>
            </div>
        </nav>
    );
};

export default MobileNavigation;