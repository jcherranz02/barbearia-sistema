import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register Service Worker for PWA installation support
if ('serviceWorker' in navigator && (import.meta as any).env?.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('PWA Service Worker registered:', reg.scope))
      .catch((err) => console.error('PWA Service Worker registration failed:', err));
  });
} else if ('serviceWorker' in navigator) {
  // In dev mode, we can register it as well or just let it exist
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('Dev PWA Service Worker registered:', reg.scope))
      .catch((err) => console.error('Dev PWA Service Worker register error:', err));
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
