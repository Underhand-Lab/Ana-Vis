import React from 'react';
import ElectronNavigation from './electron/Navigation';
import WebNavigation from './not-electron/Navigation';

interface NavigationProps {
  fileButtons?: any[];
  toolButtons?: any[];
}

const Navigation: React.FC<NavigationProps> = ({ fileButtons = [], toolButtons = [] }) => {
    
  const isDesktop = (import.meta as any).env?.VITE_DIST === 'desktop';

  return isDesktop ? (
    <ElectronNavigation fileButtons={fileButtons} toolButtons={toolButtons} />
  ) : (
    <WebNavigation fileButtons={fileButtons} toolButtons={toolButtons} />
  );
};

export default Navigation;
