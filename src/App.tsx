import { HashRouter } from 'react-router-dom';
import ExternalFileBridge from '@common/bridges/ExternalFileBridge';
import AppPage from './pages/AppPage';

export default function App() {
  return (
    <HashRouter>
      <ExternalFileBridge />
      <AppPage/>
    </HashRouter>
  );
}