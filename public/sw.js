/**
 * RETROVERSE OS - SERVICE WORKER (V20)
 * Optimized for COOP/COEP Isolation and Mass Ingestion
 */

const CACHE_NAME = 'retroos-shell-v20';
const ROM_CACHE = 'retroos-roms-v20';
const IMAGE_CACHE = 'retroos-images-v20';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/sw.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (![CACHE_NAME, ROM_CACHE, IMAGE_CACHE].includes(cacheName)) {
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

// Helper to add COOP/COEP/CORP headers
function addIsolationHeaders(response, isNavigate = false) {
  if (!response || response.status === 0) return response;
  
  const newHeaders = new Headers(response.headers);
  
  // Mandatory for cross-origin isolation
  if (isNavigate) {
    newHeaders.set("Cross-Origin-Embedder-Policy", "require-corp");
    newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");
  }
  
  // Mandatory for subresources to be loaded in a COEP environment
  newHeaders.set("Cross-Origin-Resource-Policy", "cross-origin");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  const isCrossOrigin = url.origin !== self.location.origin;
  const isNavigate = request.mode === 'navigate';
  
  const isImage = request.destination === 'image' || 
                  url.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico)$/i) ||
                  url.href.includes('archive.org/services/img');
                  
  const isRom = url.pathname.includes('/roms/') || 
                url.href.includes('archive.org/download/') ||
                (url.href.includes('githubusercontent.com') && url.pathname.includes('/master/'));

  // 1. Handle ROMs and Images with Cache-First + Tunnel Fallback
  if (isRom || isImage) {
    const cacheName = isImage ? IMAGE_CACHE : ROM_CACHE;
    event.respondWith(
      handleCacheFirst(cacheName, request, isCrossOrigin).then(res => addIsolationHeaders(res, false))
    );
    return;
  }

  // 2. Handle Cross-Origin API and other requests with Tunnel Fallback
  if (isCrossOrigin) {
    event.respondWith(
      fetch(request).then(res => addIsolationHeaders(res, isNavigate)).catch(async () => {
        const allowedDomains = ['archive.org', 'raw.githubusercontent.com', 'cdn.jsdelivr.net', 'myrient.erista.me', 'libretro.com'];
        if (allowedDomains.some(domain => url.hostname.includes(domain))) {
          console.log(`[SW] Tunneling failing cross-origin request: ${url.href}`);
          const tunnelUrl = `/api/tunnel?url=${encodeURIComponent(url.href)}`;
          const tunnelRes = await fetch(tunnelUrl);
          return addIsolationHeaders(tunnelRes, isNavigate);
        }
        throw new Error('Network failure and no tunnel available');
      })
    );
    return;
  }

  // 3. Default: Network first with Cache fallback for Shell
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (request.method === 'GET' && networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return addIsolationHeaders(networkResponse, isNavigate);
      })
      .catch(() => {
        return caches.match(request).then((response) => {
          if (response) return addIsolationHeaders(response, isNavigate);
          if (isNavigate) {
            return caches.match('/index.html').then(res => addIsolationHeaders(res, true));
          }
          return response;
        });
      })
  );
});

async function handleCacheFirst(cacheName, request, forceCors = false) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  if (cachedResponse) return cachedResponse;

  try {
    let fetchRequest = request;
    if (forceCors && request.mode !== 'cors') {
      fetchRequest = new Request(request.url, {
        method: request.method,
        headers: request.headers,
        mode: 'cors',
        credentials: 'omit',
        redirect: 'follow'
      });
    }

    const networkResponse = await fetch(fetchRequest);
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (e) {
    const url = new URL(request.url);
    const allowedDomains = ['archive.org', 'raw.githubusercontent.com', 'cdn.jsdelivr.net', 'myrient.erista.me', 'libretro.com'];
    
    if (allowedDomains.some(domain => url.hostname.includes(domain))) {
      try {
        const tunnelUrl = `/api/tunnel?url=${encodeURIComponent(request.url)}`;
        const tunnelResponse = await fetch(tunnelUrl);
        if (tunnelResponse && tunnelResponse.status === 200) {
          cache.put(request, tunnelResponse.clone());
          return tunnelResponse;
        }
      } catch (tunnelError) {
        console.warn('[SW] Tunnel fallback failed:', tunnelError);
      }
    }
    throw e;
  }
}
