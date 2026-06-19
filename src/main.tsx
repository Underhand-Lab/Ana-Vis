import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { polyfill } from 'mobile-drag-drop';
import { scrollBehaviourDragImageTranslateOverride } from 'mobile-drag-drop/scroll-behaviour';

import App from './App'
import { I18nextProvider } from 'react-i18next';
import i18n from '@shared/utils/i18n';

polyfill({
  holdToDrag: 50,
  dragImageTranslateOverride: scrollBehaviourDragImageTranslateOverride,
});

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
);
