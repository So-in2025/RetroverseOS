import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global error handler for boot issues
window.onerror = (message, source, lineno, colno, error) => {
  console.error('[Boot Error]:', { message, source, lineno, colno, error });
  // If we're in a black screen state, try to show something
  const root = document.getElementById('root');
  if (root && root.innerHTML === '') {
    root.innerHTML = `
      <div style="background: #0a0a0a; color: #ff4444; padding: 20px; font-family: monospace; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
        <h1 style="margin-bottom: 20px; font-size: 24px; letter-spacing: 2px;">SYSTEM BOOT FAILURE</h1>
        <p style="color: #666; max-width: 600px; font-size: 14px;">${message}</p>
        <button onclick="window.location.reload()" style="margin-top: 30px; background: #222; color: #0f0; border: 1px solid #0f0; padding: 10px 20px; font-family: monospace; cursor: pointer; text-transform: uppercase;">REBOOT SYSTEM</button>
      </div>
    `;
  }
};

// Register Service Worker for Offline Support and COOP/COEP
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('SW registered: ', registration);
      
      // If we're not cross-origin isolated, we need the service worker to take control and reload
      if (!window.crossOriginIsolated && registration.active) {
        // Prevent infinite reload loops
        const reloadCount = parseInt(sessionStorage.getItem('coi_reload_count') || '0');
        if (reloadCount < 3) {
          sessionStorage.setItem('coi_reload_count', (reloadCount + 1).toString());
          console.log(`Reloading to enable COOP/COEP isolation (attempt ${reloadCount + 1})...`);
          window.location.reload();
        } else {
          console.error('Failed to enable COOP/COEP isolation after multiple attempts.');
        }
      } else if (window.crossOriginIsolated) {
        // Reset reload count on success
        sessionStorage.removeItem('coi_reload_count');
      }
      
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available, reload
              window.location.reload();
            }
          });
        }
      });
    }).catch(registrationError => {
      console.log('SW registration failed: ', registrationError);
    });
  });
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
