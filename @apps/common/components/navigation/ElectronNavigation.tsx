import React, { useEffect, ChangeEvent, useMemo, useState, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { NavButton } from './WebNavigation';
import { vars } from '@shared/bridges/UIBridge';


interface ElectronNavigationProps {
    fileButtons?: NavButton[];
    toolButtons?: NavButton[];
}

const ElectronNavigation: React.FC<ElectronNavigationProps> = ({ fileButtons = [], toolButtons = [] }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isFullScreen, setIsFullScreen] = useState(false); // 전체 화면 상태를 관리하는 새로운 state
    const [updateAvailable, setUpdateAvailable] = useState(false); // 업데이트 가능 여부 상태

    // 마우스 드래그 스크롤을 위한 Ref 및 상태
    const scrollRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const lastX = useRef(0);
    const dragDistance = useRef(0); // 드래그인지 단순 클릭인지 구분하기 위한 누적 거리
    const [cursor, setCursor] = useState<'pointer' | 'grabbing'>('pointer');

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

            // 업데이트 확인 이벤트 리스너
            const handleUpdateAvailable = () => setUpdateAvailable(true);
            electron.ipcRenderer.on('update-available', handleUpdateAvailable);
            
            // 앱 시작 시 혹은 주기적으로 업데이트 체크 요청 (메인 프로세스에서 처리)
            electron.ipcRenderer.send('check-for-updates');

            return () => {
                electron.ipcRenderer.removeAllListeners('menu-command');
                electron.ipcRenderer.removeAllListeners('fullscreen-status-changed'); // 이벤트 리스너 정리
                electron.ipcRenderer.removeAllListeners('update-available');
            };
        }
    }, [fileButtons, toolButtons, navigate, location.pathname]);

    // 마우스 드래그 핸들러
    const handleMouseDown = (e: React.MouseEvent) => {
        isDragging.current = true;
        lastX.current = e.clientX;
        dragDistance.current = 0; // 드래그 시작 시 거리 초기화
        setCursor('grabbing');
    };

    const handleMouseLeaveOrUp = () => {
        isDragging.current = false;
        setCursor('pointer');
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging.current || !scrollRef.current) return;
        const deltaX = e.clientX - lastX.current;
        scrollRef.current.scrollLeft -= deltaX;
        lastX.current = e.clientX;
        dragDistance.current += Math.abs(deltaX); // 이동 거리 누적
    };

    const handleFeatureChange = (e: ChangeEvent<HTMLSelectElement>) => {
        navigate(e.target.value);
    };

    // 업데이트 버튼 클릭 핸들러
    const handleUpdateClick = () => {
        const electron = (window as any).electron;
        if (electron?.ipcRenderer) electron.ipcRenderer.send('start-update');
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
            // 전체 화면일 때는 시스템 버튼 영역이 필요 없으므로 20px로 줄입니다.
            // titleBarOverlay 설정 시 env(titlebar-area-width)로 정확한 너비를 가져올 수 있습니다.
            // 변수가 없을 경우를 대비해 기본값(fallback)을 140px에서 상황에 맞게 조정 가능합니다.
            paddingRight: isMac 
                ? '20px' 
                : (isFullScreen ? '20px' : '140px'),
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
                    <li style={{ margin: 0 }}>CV-Val</li>
                </ul>

                {/* 중앙 여백 영역: 아무런 스타일이 없으므로 부모의 'drag' 속성을 유지하여 창 핸들 역할을 합니다. */}
                <div style={{ flex: 1, minHeight: '30px' }} />

                {/* 업데이트 버튼: 업데이트가 가능할 때만 표시 */}
                {updateAvailable && (
                    <button
                        onClick={handleUpdateClick}
                        style={{
                            ...interactiveStyle,
                            backgroundColor: '#e74c3c',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '4px 12px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        Update Available
                    </button>
                )}

                <div 
                    className="hide-scrollbar"
                    ref={scrollRef}
                    onMouseDown={handleMouseDown}
                    onMouseLeave={handleMouseLeaveOrUp}
                    onMouseUp={handleMouseLeaveOrUp}
                    onMouseMove={handleMouseMove}
                    onWheel={(e) => {
                        // 세로 휠 입력을 가로 스크롤로 변환합니다.
                        if (e.deltaY !== 0) {
                            e.currentTarget.scrollLeft += e.deltaY;
                        }
                    }}
                    style={{ 
                        ...interactiveStyle,
                        pointerEvents: 'auto', // 이벤트를 확실히 수신하도록 설정
                        minWidth: 0,
                        overflowX: 'auto',
                        display: 'flex',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                        WebkitMaskImage: 'linear-gradient(to right, transparent, black 30px, black calc(100% - 30px), transparent)',
                        maskImage: 'linear-gradient(to right, transparent, black 30px, black calc(100% - 30px), transparent)',
                        padding: '0 10px', // 마진 음수 값 제거하여 드래그 영역과의 겹침 방지
                        cursor: cursor,
                        userSelect: 'none', // 드래그 중 텍스트 선택 방지
                        WebkitUserSelect: 'none'
                    }}
                >
                    {/* 내부 리스트에도 명확하게 interactiveStyle 적용 */}
                    <ul style={{ ...interactiveStyle, display: 'flex', gap: '8px', listStyle: 'none', padding: 0, margin: '0 0 0 auto', width: 'max-content', flexShrink: 0 }}>
                        {fileButtons.map((btn) => (
                            <li key={btn.name} style={{ margin: 0 }}>
                                <button
                                    onClick={() => {
                                        // 마우스 이동 거리가 5px 미만일 때만 실제 클릭으로 인정합니다.
                                        if (dragDistance.current < 5) {
                                            btn.action();
                                        }
                                    }}
                                    style={{ ...interactiveStyle, padding: '2px 10px', whiteSpace: 'nowrap', cursor: 'pointer', fontFamily: vars.font  }}
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