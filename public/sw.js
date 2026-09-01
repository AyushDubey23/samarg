/**
 * SAMARG Offline & 404 Service Worker
 * Caches custom 404 error page and serves 404.html on offline reloads / network failures.
 */

const CACHE_NAME = 'samarg-offline-v1';
const OFFLINE_URL = '/404.html';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/404.html',
  '/favicon.svg'
];

// Install Service Worker and cache 404 page & core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Service Worker and clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Intercept fetch requests: Serve 404 page when reloaded offline / network fails
self.addEventListener('fetch', (event) => {
  // Handle HTML navigation requests (page reloads & direct navigation)
  if (event.request.mode === 'navigate' || (event.request.method === 'GET' && event.request.headers.get('accept')?.includes('text/html'))) {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached404 = await cache.match(OFFLINE_URL);
        if (cached404) {
          return cached404;
        }
        const cachedIndex = await cache.match('/index.html');
        return cachedIndex || Response.error();
      })
    );
    return;
  }

  // Handle static asset requests
  if (event.request.method === 'GET') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) return cachedResponse;
        if (event.request.headers.get('accept')?.includes('text/html')) {
          const cache = await caches.open(CACHE_NAME);
          return cache.match(OFFLINE_URL);
        }
      })
    );
  }
});
