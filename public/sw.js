const CACHE_NAME = 'retroos-shell-v3';
const ROM_CACHE = 'retroos-roms-v1';
const IMAGE_CACHE = 'retroos-images-v1';
const STATIC_CACHE = 'retroos-static-v1';

const ASSETS_TO_PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/sw.js',
  // UI Critical Assets (Icons, Fonts, Sounds)
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/fonts/inter-var.woff2',
  '/sounds/boot.mp3',
  '/sounds/ui-click.mp3',
  '/sounds/unboxing.mp3'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_PRECACHE);
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
            if (![CACHE_NAME, ROM_CACHE, IMAGE_CACHE, STATIC_CACHE].includes(cacheName) && cacheName.startsWith('retroos')) {
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Helper to add COOP/COEP headers
  const addHeaders = (response) => {
    if (!response || response.status === 0 || response.type === 'opaque') return response;
    
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp');
    newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');
    newHeaders.set('Cross-Origin-Resource-Policy', 'cross-origin');
    
    // Some browsers might need this for iframes
    newHeaders.set('Cross-Origin-Embedder-Policy-Report-Only', 'require-corp');
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  };

  // 1. ROMs: Cache-First
  if (url.pathname.includes('/roms/') || url.href.includes('archive.org') || url.href.includes('erista.me')) {
    event.respondWith(handleCacheFirst(ROM_CACHE, event.request).then(addHeaders));
    return;
  }

  // 2. Images: Stale-While-Revalidate
  if (url.href.includes('unsplash.com') || url.href.includes('picsum.photos') || url.href.includes('libretro.com') || url.pathname.includes('/api/tunnel')) {
    event.respondWith(handleStaleWhileRevalidate(IMAGE_CACHE, event.request).then(addHeaders));
    return;
  }

  // 3. Static Assets (Fonts, Sounds): Cache-First
  if (url.pathname.match(/\.(woff2|mp3|png|jpg|svg)$/)) {
    event.respondWith(handleCacheFirst(STATIC_CACHE, event.request).then(addHeaders));
    return;
  }

  // 4. Default: Network First with Cache Fallback
  event.respondWith(
    fetch(event.request).then((networkResponse) => {
      if (event.request.method === 'GET' && networkResponse && networkResponse.status === 200) {
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
      }
      return addHeaders(networkResponse);
    }).catch(() => {
      return caches.match(event.request).then((response) => {
        if (response) return addHeaders(response);
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html').then(addHeaders);
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

async function handleStaleWhileRevalidate(cacheName, request) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  });

  return cachedResponse || fetchPromise;
}
