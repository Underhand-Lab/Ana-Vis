import React, { useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';

const Navigation = ({ fileButtons = [], toolButtons = [] }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Electron 환경 및 명시적 데스크톱 빌드 여부를 판단합니다.
  const isElectron = typeof window !== 'undefined' && navigator.userAgent.toLowerCase().includes('electron');
  const isDesktopBuild = import.meta.env.VITE_DIST === 'desktop';
  const isWeb = !isElectron && !isDesktopBuild;

  // Electron 시스템 메뉴 설정 및 동기화
  useEffect(() => {
    if (isWeb) return;

    // 1. 메인 프로세스로 보낼 메뉴 구조 생성 (순수 객체만 가능)
    const menuData = {
      features: [
        { label: '자세', path: '/pose' },
        { label: '공 추적', path: '/track-ball' },
        { label: '배트 궤적', path: '/track-bat' }
      ],
      currentPath: location.pathname,
      fileActions: fileButtons.map((btn, index) => ({
        label: btn.name,
        index: index // 클릭 시 식별하기 위한 인덱스
      })),
      toolActions: toolButtons.map((btn, index) => ({
        label: btn.name,
        index: index
      }))
    };

    // 메인 프로세스에 메뉴 업데이트 요청 (전역 window.electron 객체 가정)
    if (window.electron && window.electron.ipcRenderer) {
      window.electron.ipcRenderer.send('update-native-menu', menuData);

      // 2. 메인 프로세스에서 발생한 메뉴 클릭 이벤트 리스너 등록
      const handleMenuCommand = (event, type, payload) => {
        if (type === 'navigate') {
          navigate(payload);
        } else if (type === 'fileAction') {
          const action = fileButtons[payload]?.action;
          if (typeof action === 'function') action();
        } else if (type === 'toolAction') {
          const action = toolButtons[payload]?.action;
          if (typeof action === 'function') {
            action();
          }
        }
      };

      window.electron.ipcRenderer.on('menu-command', handleMenuCommand);

      return () => {
        // 컴포넌트 언마운트 시 또는 buttons 변경 시 리스너 중복 방지를 위해 제거
        window.electron.ipcRenderer.removeAllListeners('menu-command');
      };
    }
  }, [isWeb, fileButtons, toolButtons, navigate, location.pathname]);

  // 셀렉트 박스 변경 시 페이지 이동 (기존 value="../pose" 등의 로직 대체)
  const handleFeatureChange = (e) => {
    const path = e.target.value;
    const target = path.replace('../', '/');
    navigate(target);
  };

  // 데스크탑(App) 환경일 때의 상단 메뉴 스타일
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
    padding: isWeb ? '10px 0' : '4px 0',
    WebkitAppRegion: isWeb ? 'none' : 'drag',
    borderBottom: isWeb ? 'none' : '1px solid #333',
  };

  const interactiveStyle = !isWeb ? { WebkitAppRegion: 'no-drag' } : {};

  return (
    <nav style={navStyle}>
      <div style={{
        padding: isWeb ? '0' : '0px 120px',
        display:'flex',
        alignItems: 'center',
        justifyContent: isWeb ? 'space-around' : 'space-between',
        flexWrap : isWeb ? 'wrap' : 'nowrap'
      }}>
      <ul style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', listStyle: 'none', padding: 0, margin: 0 }}>
        {/* 기존의 <a href="../"> 대신 Link 컴포넌트 사용 */}
        <li style={interactiveStyle}><Link to="/">CV-Val</Link></li>
        <li>
          {/* 리액트 친화적인 select로 교체 */}
          <select 
            id="feature" 
            className="neumorphism-select" 
            style={{...interactiveStyle, display: 'block'}}
            value={`..${location.pathname === '/' ? '/home' : location.pathname}`} 
            onChange={handleFeatureChange}
          >
            <option value="../pose">자세</option>
            <option value="../track-ball">공 추적</option>
            <option value="../track-bat">배트 궤적</option>
          </select>
        </li>
      </ul>
      
      <ul style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', listStyle: 'none', padding: 0, margin: 0 }}>
        {
          [...fileButtons].map((btn) => {
            return (
              <li key={btn.name}>
                <button onClick={btn.action} style={{ ...interactiveStyle, padding: '5px 12px'}}>
                  {btn.name}
                </button>
              </li>
            );
          })
        }
      </ul>
      </div>
    </nav>
  );
};

export default Navigation;