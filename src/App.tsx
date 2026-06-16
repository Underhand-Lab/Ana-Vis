import { HashRouter } from 'react-router-dom';
import ExternalFileBridge from '@apps/common/bridges/ExternalFileBridge';
import AppPage from '@apps/pages/AppPage';
import { polyfill } from "mobile-drag-drop";
import { scrollBehaviourDragImageTranslateOverride } from "mobile-drag-drop/scroll-behaviour";

// 모바일 드래그 앤 드롭 폴리필 실행
polyfill({
    holdToDrag: 200, // 200ms 동안 꾹 눌러야 드래그 시작 (실수 방지)
    // 스크롤 중인 화면에서도 드래그 이미지가 올바른 위치에 나타나도록 설정
    dragImageTranslateOverride: scrollBehaviourDragImageTranslateOverride
});

export default function App() {
  return (
    <HashRouter>
      <ExternalFileBridge />
      <AppPage/>
    </HashRouter>
  );
}