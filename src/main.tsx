import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App'
import { I18nextProvider } from 'react-i18next';
import i18n from './features/cv-val/core/i18n'; // i18n 설정 파일 임포트

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find the root element. Check if index.html has an element with id="root".');
}

createRoot(rootElement).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <App />
    </I18nextProvider>
  </StrictMode>
)
