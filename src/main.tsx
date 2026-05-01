import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App'

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find the root element. Check if index.html has an element with id="root".');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
)
