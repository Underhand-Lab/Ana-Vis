import React from 'react';
import ElectronFileHandler from './electron/ExternalFileHandler';

const ExternalFileBridge = () => {
  const isElectron = typeof window !== 'undefined' && navigator.userAgent.toLowerCase().includes('electron');
  const isDesktopBuild = import.meta.env.VITE_DIST === 'desktop';
  const isDesktop = isElectron || isDesktopBuild;

  return isDesktop ? (
    <ElectronFileHandler />
  ) : (
    <></>
  );
};

export default ExternalFileBridge;