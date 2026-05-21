import React from 'react';
import ElectronNavigation from '../components/navigation/ElectronNavigation';
import WebNavigation from '../components/navigation/WebNavigation';

interface NavigationProps {
  fileButtons?: any[];
  toolButtons?: any[];
}

const Navigation: React.FC<NavigationProps> = ({ fileButtons = [], toolButtons = [] }) => {
    
  const isDesktop = (import.meta as any).env?.VITE_DIST === 'desktop';
  const isMobile = (import.meta as any).env?.VITE_DIST === 'mobile';

  if (isDesktop) {
    return <ElectronNavigation fileButtons={fileButtons} toolButtons={toolButtons} />;
  }
  if (isMobile) {
    //return <MobileNavigation fileButtons={fileButtons} toolButtons={toolButtons} />;
  }
  return <WebNavigation fileButtons={fileButtons} toolButtons={toolButtons} />;
};

export default Navigation;
