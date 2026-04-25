import React from 'react';
import ElectronFileHandler from './electron/ExternalFileHandler';

const ExternalFileBridge = () => {
  // 빌드 타임 상수를 사용하여 '전처리기'처럼 작동하게 합니다.
  // VITE_DIST가 'desktop'이 아닐 경우, 아래의 ElectronFileHandler 관련 코드는 빌드 시 완전히 제거됩니다.
  const isDesktop = import.meta.env.VITE_DIST === 'desktop';

  return isDesktop ? (
    <ElectronFileHandler />
  ) : (
    <></>
  );
};

export default ExternalFileBridge;