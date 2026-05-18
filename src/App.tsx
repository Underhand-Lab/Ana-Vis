import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';

import HomeBridge from '@/_legacy/pages/Home/HomeBridge';
import ExternalFileBridge from '@common/bridges/ExternalFileBridge';

import PosePage from '@/_legacy/pages/PosePage';
import TrackBallPage from '@/_legacy/pages/TrackBallPage';
import TrackBatPage from '@/_legacy/pages/TrackBatPage';

const STORAGE_KEY = 'cv_val_last_path';

function AppContent() {
  const location = useLocation();
  
  // 페이지가 바뀔 때마다 마지막 경로 저장 (루트 제외)
  useEffect(() => {
    if (location.pathname !== '/') {
      localStorage.setItem(STORAGE_KEY, location.pathname);
    }
  }, [location]);

  // 앱 환경일 때 리다이렉트할 경로 결정 (저장된 경로가 없으면 기본으로 /pose)
  // localStorage.getItem은 string | null을 반환하므로 대체값을 지정합니다.
  const lastPath: string = localStorage.getItem(STORAGE_KEY) || '/pose';

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

export default function App() {
  return (
    <HashRouter>
      <ExternalFileBridge />
      <AppContent />
    </HashRouter>
  );
}