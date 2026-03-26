import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { sentinel } from './services/sentinel';

// Start Sentinel Auditing (Only in Dev)
if (import.meta.env.DEV) {
  console.log('📦 [Main] Starting Sentinel...');
  sentinel.start();
}

// Mock WakeLock to prevent "Access to Screen Wake Lock features is disallowed by permissions policy"
if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
  try {
    const originalRequest = navigator.wakeLock.request.bind(navigator.wakeLock);
    navigator.wakeLock.request = async (type: 'screen') => {
      try {
        return await originalRequest(type);
      } catch (err) {
        console.warn('⚠️ [Main] WakeLock request failed (Permission Policy):', err);
        // Return a mock sentinel to prevent crashes in libraries that expect it
        return {
          released: false,
          type: 'screen',
          release: async () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          onrelease: null,
        } as any;
      }
    };
  } catch (e) {
    console.error('❌ [Main] Failed to mock WakeLock:', e);
  }
}

// Global error handler for boot issues
window.onerror = (message, source, lineno, colno, error) => {
  console.error('🔥 [Main] Global Error Caught:', { message, source, lineno, colno, error });
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

// Register Service Worker for Offline Support
if ('serviceWorker' in navigator) {
  // We are using coi-serviceworker for SharedArrayBuffer support
  // It registers itself automatically via the script in index.html
}

import { ErrorBoundary } from './components/ErrorBoundary.tsx';

const rootElement = document.getElementById('root');
if (rootElement) {
  console.log('📦 [Main] Mounting React root...');
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
  console.log('✅ [Main] React root mounted');
} else {
  console.error('❌ [Main] Root element not found!');
}
