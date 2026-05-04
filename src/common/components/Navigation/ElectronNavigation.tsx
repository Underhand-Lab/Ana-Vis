import React, { useEffect, ChangeEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { NavButton } from './WebNavigation';
import Select from '../ui/react-web/common/Select';

export const FEATURES = [
    { label: '자세', value: '/pose' },
    { label: '공 추적', value: '/track-ball' },
    { label: '배트 궤적', value: '/track-bat' }
];


interface ElectronNavigationProps {
    fileButtons?: NavButton[];
    toolButtons?: NavButton[];
}

const ElectronNavigation: React.FC<ElectronNavigationProps> = ({ fileButtons = [], toolButtons = [] }) => {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const menuData = {
            // FEATURES 배열을 기반으로 네이티브 메뉴 데이터 생성
            features: FEATURES.map(f => ({ label: `${f.label} 분석`, path: f.value })),
            currentPath: location.pathname,
            fileActions: fileButtons.map((btn, index) => ({ label: btn.name, index })),
            toolActions: toolButtons.map((btn, index) => ({ label: btn.name, index }))
        };

        const electron = (window as any).electron;

        if (electron?.ipcRenderer) {
            electron.ipcRenderer.send('update-native-menu', menuData);

            const handleMenuCommand = (_event: any, type: string, payload: any) => {
                if (type === 'navigate') navigate(payload);
                else if (type === 'fileAction') fileButtons[payload]?.action?.();
                else if (type === 'toolAction') toolButtons[payload]?.action?.();
            };

            electron.ipcRenderer.on('menu-command', handleMenuCommand);
            return () => electron.ipcRenderer.removeAllListeners('menu-command');
        }
    }, [fileButtons, toolButtons, navigate, location.pathname]);

    const handleFeatureChange = (e: ChangeEvent<HTMLSelectElement>) => {
        navigate(e.target.value);
    };

    const currentPath = location.pathname === '/' ? '/pose' : location.pathname;

    const navStyle: React.CSSProperties & { WebkitAppRegion?: string } = {
        position: 'sticky',
        top: 0,
        width: '100%',
        backgroundColor: 'var(--secondary-color)',
        color: '#aaaaaa',
        fontSize: '15px',
        margin: 0,
        zIndex: 2000,
        transition: 'transform 0.5s ease',
        padding: '5px 0 2px',
        WebkitAppRegion: 'drag',
        borderBottom: '1px solid #333',
    };

    const interactiveStyle: React.CSSProperties & { WebkitAppRegion?: string } = { WebkitAppRegion: 'no-drag' };

    return (
        <nav style={navStyle}>
            <div style={{
                padding: '0px 140px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'nowrap'
            }}>
                <ul style={{ display: 'flex', gap: '8px', listStyle: 'none', padding: 0, margin: 0 }}>
                    <li style={interactiveStyle}>
                        <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>CV-Val</Link>
                    </li>

                    <li style={interactiveStyle}>
                        <Select 
                            className="neumorphism-select"
                            style={interactiveStyle}
                            options={FEATURES}
                            value={currentPath}
                            onChange={handleFeatureChange}
                        />
                    </li>
                </ul>

                <ul style={{ display: 'flex', gap: '8px', listStyle: 'none', padding: 0, margin: 0 }}>
                    {fileButtons.map((btn) => (
                        <li key={btn.name} style={interactiveStyle}>
                            <button
                                onClick={btn.action}
                                style={{ padding: '2px 10px' }}
                            >
                                {btn.name}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </nav>
    );
};

export default ElectronNavigation;