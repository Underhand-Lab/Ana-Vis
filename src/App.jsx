// ✅ 올바른 예시: 함수형 컴포넌트 내부에서 렌더링
import React from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';

import Navigation from './components/Navigation';

import HomePage from './pages/HomePage';
import PosePage from './pages/PosePage';
import TrackBallPage from './pages/TrackBallPage';
import TrackBatPage from './pages/TrackBatPage';

function AppContent() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
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