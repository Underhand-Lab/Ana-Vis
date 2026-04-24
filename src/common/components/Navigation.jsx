import React from 'react';
import ElectronNavigation from './electron/Navigation';
import WebNavigation from './not-electron/Navigation';

const Navigation = ({ fileButtons = [], toolButtons = [] }) => {
  const isElectron = typeof window !== 'undefined' && navigator.userAgent.toLowerCase().includes('electron');
  const isDesktopBuild = import.meta.env.VITE_DIST === 'desktop';
  const isDesktop = isElectron || isDesktopBuild;

  return isDesktop ? (
    <ElectronNavigation fileButtons={fileButtons} toolButtons={toolButtons} />
  ) : (
    <WebNavigation fileButtons={fileButtons} toolButtons={toolButtons} />
  );
};

export default Navigation;
