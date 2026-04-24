// ✅ 올바른 예시: 함수형 컴포넌트 내부에서 렌더링
import React, { useEffect } from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';

import Navigation from './common/components/Navigation';
import HomeBridge from './pages/Home/HomeBridge';
import ExternalFileBridge from './common/components/ExternalFileBridge';

import PosePage from './pages/PosePage';
import TrackBallPage from './pages/TrackBallPage';
import TrackBatPage from './pages/TrackBatPage';

const STORAGE_KEY = 'cv_val_last_path';

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // 페이지가 바뀔 때마다 마지막 경로 저장 (루트 제외)
  useEffect(() => {
    if (location.pathname !== '/') {
      localStorage.setItem(STORAGE_KEY, location.pathname);
    }
  }, [location]);

  // 앱 환경일 때 리다이렉트할 경로 결정 (저장된 경로가 없으면 기본으로 /pose)
  const lastPath = localStorage.getItem(STORAGE_KEY) || '/pose';

  return (
    <Routes>
      {/* 외부 파일 감지 핸들러 등록 */}
      
      {/* web일 때는 HomePage를 보여주고, 아니면 마지막 접속 페이지로 리다이렉트 */}
      <Route 
        path="/" 
        element={<HomeBridge lastPath={lastPath} />} 
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
      <ExternalFileBridge />
      <AppContent />
    </HashRouter>
  );
}

export default App;