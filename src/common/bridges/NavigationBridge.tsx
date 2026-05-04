import React from 'react';
import ElectronNavigation from '../components/Navigation/ElectronNavigation';
import WebNavigation from '../components/Navigation/WebNavigation';

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
