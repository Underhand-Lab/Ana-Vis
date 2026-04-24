import React from 'react';
import WebHomePage from './WebHomePage';
import ElectronHomePage from './ElectronHomePage';

const HomeBridge = ({ lastPath }) => {
  
  const isElectron = typeof window !== 'undefined' && navigator.userAgent.toLowerCase().includes('electron');
  const isDesktopBuild = import.meta.env.VITE_DIST === 'desktop';
  const isDesktop = isElectron || isDesktopBuild;

  if (!isDesktop)
    return <WebHomePage />;

  return <ElectronHomePage lastPath={lastPath}/>
};

export default HomeBridge;