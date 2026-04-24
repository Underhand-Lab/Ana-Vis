import React from 'react';
import { Navigate } from 'react-router-dom';

const ElectronHomePage = ({ lastPath }) => {
  return <Navigate to={lastPath} replace state={{}} />;
};

export default ElectronHomePage;
