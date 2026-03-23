const CACHE_NAME = 'retroos-shell-v3';
const ROM_CACHE = 'retroos-roms-v1';
const IMAGE_CACHE = 'retroos-images-v1';

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
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== ROM_CACHE && cacheName !== IMAGE_CACHE && cacheName.startsWith('retroos')) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// COOP/COEP Header Injection for SharedArrayBuffer support
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Handle ROMs (usually .zip, .sfc, .nes, etc. from specific domains or paths)
  if (url.pathname.includes('/roms/') || url.href.includes('archive.org')) {
    event.respondWith(handleCacheFirst(ROM_CACHE, event.request));
    return;
  }

  // Handle Images (Covers, Artworks)
  if (url.href.includes('unsplash.com') || url.href.includes('picsum.photos') || url.href.includes('libretro.com')) {
    event.respondWith(handleCacheFirst(IMAGE_CACHE, event.request));
    return;
  }

  // Default: Network first with Cache fallback for Shell + COOP/COEP Injection
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then((response) => {
        const newHeaders = new Headers(response.headers);
        newHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp');
        newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders,
        });
      }).catch(() => {
        return caches.match('/index.html').then(response => {
          if (!response) return null;
          const newHeaders = new Headers(response.headers);
          newHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp');
          newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders,
          });
        });
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request).then((networkResponse) => {
      if (event.request.method === 'GET' && networkResponse && networkResponse.status === 200) {
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
      }
      return networkResponse;
    }).catch(() => {
      return caches.match(event.request).then((response) => {
        if (response) return response;
      });
    })
  );
});

async function handleCacheFirst(cacheName, request) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  if (cachedResponse) return cachedResponse;

  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (e) {
    return null;
  }
}
