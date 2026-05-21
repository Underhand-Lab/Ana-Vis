import { HashRouter } from 'react-router-dom';
import ExternalFileBridge from '@shared/bridges/ExternalFileBridge';
import AppPage from '@apps/pages/AppPage';

export default function App() {
  return (
    <HashRouter>
      <ExternalFileBridge />
      <AppPage/>
    </HashRouter>
  );
}