import React, { useEffect, ChangeEvent, useMemo, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { NavButton, FEATURES } from './WebNavigation';


interface ElectronNavigationProps {
    fileButtons?: NavButton[];
    toolButtons?: NavButton[];
}

const ElectronNavigation: React.FC<ElectronNavigationProps> = ({ fileButtons = [], toolButtons = [] }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isFullScreen, setIsFullScreen] = useState(false); // 전체 화면 상태를 관리하는 새로운 state

    useEffect(() => {
        const menuData = {
            // FEATURES 배열을 기반으로 네이티브 메뉴 데이터 생성
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

            // 메인 프로세스로부터 현재 전체 화면 상태를 요청하고, 변경 이벤트를 수신합니다.
            electron.ipcRenderer.invoke('get-fullscreen-status').then((status: boolean) => {
                setIsFullScreen(status);
            });

            const handleFullscreenChange = (_event: any, status: boolean) => {
                setIsFullScreen(status);
            };
            electron.ipcRenderer.on('fullscreen-status-changed', handleFullscreenChange);

            return () => {
                electron.ipcRenderer.removeAllListeners('menu-command');
                electron.ipcRenderer.removeAllListeners('fullscreen-status-changed'); // 이벤트 리스너 정리
            };
        }
    }, [fileButtons, toolButtons, navigate, location.pathname]);

    const handleFeatureChange = (e: ChangeEvent<HTMLSelectElement>) => {
        navigate(e.target.value);
    };

    const navStyle: React.CSSProperties & { WebkitAppRegion?: string } = {
        position: 'sticky',
        top: 0,
        width: '100%',
        maxWidth: '100vw',
        boxSizing: 'border-box',
        backgroundColor: 'var(--secondary-color)',
        color: '#aaaaaa',
        fontSize: '15px',
        margin: 0,
        zIndex: 2000,
        transition: 'transform 0.5s ease',
        padding: '5px 0 2px',
        WebkitAppRegion: 'drag',
        overflow: 'hidden',
        borderBottom: '1px solid #333',
    };
    navStyle.cursor = 'default'; // 드래그 가능한 영역은 기본 커서 유지

    const interactiveStyle: React.CSSProperties & { WebkitAppRegion?: string } = { WebkitAppRegion: 'no-drag' };

    const platformPadding = useMemo(() => {
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isMac = userAgent.includes('mac');
        
        return {
            // macOS: 좌측 Traffic Lights 영역 확보. 전체 화면 시 버튼이 사라지므로 패딩을 줄입니다.
            paddingLeft: isMac ? (isFullScreen ? '20px' : '80px') : '20px',
            // Windows: 우측 시스템 버튼 영역 확보
            // titleBarOverlay 설정 시 env(titlebar-area-width)로 정확한 너비를 가져올 수 있습니다.
            // 변수가 없을 경우를 대비해 기본값(fallback)으로 140px를 설정합니다.
            paddingRight: isMac ? '20px' : 'env(titlebar-area-width, 140px)',
        };
    }, [isFullScreen]); // isFullScreen 상태가 변경될 때마다 다시 계산

    return (
        <nav style={navStyle}>
            <div style={{
                ...platformPadding,
                paddingTop: 0,
                paddingBottom: 0,
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

                {/* 왼쪽 로고 영역: 클릭 가능하도록 no-drag 적용 */}
                <ul style={{ ...interactiveStyle, display: 'flex', gap: '8px', listStyle: 'none', padding: 0, margin: 0, flexShrink: 0, WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none', userSelect: 'none' }}>
                    <li>CV-Val</li>
                </ul>

                {/* 중앙 여백 영역: 아무런 스타일이 없으므로 부모의 'drag' 속성을 유지하여 창 핸들 역할을 합니다. */}
                <div style={{ flex: 1, minHeight: '30px' }} />

                <div 
                    className="hide-scrollbar"
                    style={{ 
                        ...interactiveStyle,
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
                            <li key={btn.name}>
                                <button
                                    onClick={btn.action}
                                    style={{ padding: '2px 10px', whiteSpace: 'nowrap', cursor: 'pointer' }}
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

export default ElectronNavigation;