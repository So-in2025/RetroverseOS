const CACHE_NAME = 'retroos-shell-v2';
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

  // Default: Network first with Cache fallback for Shell
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
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
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
