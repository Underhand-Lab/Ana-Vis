import React from 'react';
import { Navigate } from 'react-router-dom';

interface ElectronHomePageProps {
  lastPath: string;
}

const ElectronHomePage: React.FC<ElectronHomePageProps> = ({ lastPath }) => {
  return <Navigate to={lastPath} replace state={{}} />;
};

export default ElectronHomePage;
