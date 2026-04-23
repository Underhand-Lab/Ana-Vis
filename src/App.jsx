// ✅ 올바른 예시: 함수형 컴포넌트 내부에서 렌더링
import React, { useEffect } from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';

import Navigation from './common/components/Navigation';

import HomePage from './pages/HomePage';
import PosePage from './pages/PosePage';
import TrackBallPage from './pages/TrackBallPage';
import TrackBatPage from './pages/TrackBatPage';

const STORAGE_KEY = 'cv_val_last_path';

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // 1. Electron 런타임 감지 (UserAgent 기반으로 더 정확하게 감지)
  const isElectron = typeof window !== 'undefined' && navigator.userAgent.toLowerCase().includes('electron');
  // 2. 명시적 데스크톱 빌드 확인 (Vite 환경 변수 VITE_DIST 사용)
  const isDesktopBuild = import.meta.env.VITE_DIST === 'desktop';
  
  // Electron이거나 데스크톱 빌드라면 isWeb은 false가 됩니다.
  const isWeb = !isElectron && !isDesktopBuild;

  // 페이지가 바뀔 때마다 마지막 경로 저장 (루트 제외)
  useEffect(() => {
    if (location.pathname !== '/') {
      localStorage.setItem(STORAGE_KEY, location.pathname);
    }
  }, [location]);

  // 외부 파일 실행 감지 (Electron 전용)
  useEffect(() => {
    if (!isElectron || !window.electron?.ipcRenderer) return;

    const handleExternalFile = (_event, data) => {
      if (!data) return;
      
      // 데이터 구조 유연하게 파싱
      let fileName = "";
      let filePath = "";
      let content = null;

      if (typeof data === 'string') {
        filePath = data;
        fileName = data.split(/[\\/]/).pop();
      } else {
        filePath = data.path || "";
        fileName = data.name || filePath.split(/[\\/]/).pop() || "";
        content = data.content;
      }

      if (!fileName) return;
      const ext = fileName.split('.').pop()?.toLowerCase();
      
      let file = null;
      if (content) {
        const blob = new Blob([content]);
        file = new File([blob], fileName);
      }

      const extensionMap = {
        cvp: '/pose',
        cvbl: '/track-ball',
        cvbt: '/track-bat'
      };

      const targetPath = extensionMap[ext];
      if (!targetPath) {
        console.warn(`Unknown extension: ${ext}`);
        return;
      }

      // 정확한 페이지로 리다이렉트 (기존 히스토리 대체)
      navigate(targetPath, { 
        state: { 
          externalFile: file, 
          filePath: filePath 
        }, 
        replace: true 
      });
    };

    // 두 종류의 이벤트를 모두 수신하여 유연하게 대처
    window.electron.ipcRenderer.on('open-external-file', handleExternalFile);
    window.electron.ipcRenderer.on('open-associated-file', handleExternalFile);
    
    // 앱 실행 시점에 이미 전달된 파일이 있는지 확인 요청 (Main Process에 해당 채널 구현 필요)
    window.electron.ipcRenderer.send('request-initial-file');

    return () => {
      window.electron.ipcRenderer.removeAllListeners('open-external-file');
      window.electron.ipcRenderer.removeAllListeners('open-associated-file');
    };
  }, [isElectron, navigate]);

  // 앱 환경일 때 리다이렉트할 경로 결정 (저장된 경로가 없으면 기본으로 /pose)
  const lastPath = localStorage.getItem(STORAGE_KEY) || '/pose';

  return (
    <Routes>
      {/* web일 때는 HomePage를 보여주고, 아니면 마지막 접속 페이지로 리다이렉트 */}
      <Route 
        path="/" 
        element={isWeb ? <HomePage /> : <Navigate to={lastPath} replace state={{}} />} 
      />
      
      <Route path="/pose" element={<PosePage />} />
      <Route path="/track-ball" element={<TrackBallPage />} />
      <Route path="/track-bat" element={<TrackBatPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );

}

function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}

export default App;