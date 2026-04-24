import React, { useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';

const ElectronNavigation = ({ fileButtons = [], toolButtons = [] }) => {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const menuData = {
            features: [
                { label: '자세 분석', path: '/pose' },
                { label: '공 추적 분석', path: '/track-ball' },
                { label: '배트 궤적 분석', path: '/track-bat' }
            ],
            currentPath: location.pathname,
            fileActions: fileButtons.map((btn, index) => ({ label: btn.name, index })),
            toolActions: toolButtons.map((btn, index) => ({ label: btn.name, index }))
        };

        if (window.electron?.ipcRenderer) {
            window.electron.ipcRenderer.send('update-native-menu', menuData);

            const handleMenuCommand = (event, type, payload) => {
                if (type === 'navigate') navigate(payload);
                else if (type === 'fileAction') fileButtons[payload]?.action?.();
                else if (type === 'toolAction') toolButtons[payload]?.action?.();
            };

            window.electron.ipcRenderer.on('menu-command', handleMenuCommand);
            return () => window.electron.ipcRenderer.removeAllListeners('menu-command');
        }
    }, [fileButtons, toolButtons, navigate, location.pathname]);

    const handleFeatureChange = (e) => {
        navigate(e.target.value.replace('../', '/'));
    };

    const navStyle = {
        position: 'sticky',
        top: 0,
        width: '100%',
        backgroundColor: 'var(--secondary-color)',
        color: '#aaaaaa',
        fontSize: '15px',
        margin: 0,
        zIndex: 2000,
        transition: 'transform 0.5s ease',
        padding: '4px 0',
        WebkitAppRegion: 'drag',
        borderBottom: '1px solid #333',
    };

    const interactiveStyle = { WebkitAppRegion: 'no-drag' };

    return (
        <nav style={navStyle}>

            <div style={{
                padding: '0px 120px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'nowrap'
            }}>
                <ul style={{ display: 'flex', gap: '8px', listStyle: 'none', padding: 0, margin: 0 }}>

                    <li style={{ ...interactiveStyle }}>
                        <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>CV-Val</Link>
                    </li>

                    <li style={interactiveStyle}>
                        <select
                            className="neumorphism-select"
                            style={{ height: '26px' }}
                            value={`..${location.pathname === '/' ? '/home' : location.pathname}`}
                            onChange={handleFeatureChange}
                        >
                            <option value="../pose">자세</option>
                            <option value="../track-ball">공 추적</option>
                            <option value="../track-bat">배트 궤적</option>
                        </select>
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
