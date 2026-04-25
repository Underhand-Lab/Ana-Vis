import React from 'react';
import ElectronNavigation from './electron/Navigation';
import WebNavigation from './not-electron/Navigation';

const Navigation = ({ fileButtons = [], toolButtons = [] }) => {
  // 웹 빌드 시 이 변수는 false literal로 대체되며, 
  // ElectronNavigation 컴포넌트와 그 하위 로직은 트리 쉐이킹에 의해 삭제됩니다.
  const isDesktop = import.meta.env.VITE_DIST === 'desktop';

  return isDesktop ? (
    <ElectronNavigation fileButtons={fileButtons} toolButtons={toolButtons} />
  ) : (
    <WebNavigation fileButtons={fileButtons} toolButtons={toolButtons} />
  );
};

export default Navigation;
