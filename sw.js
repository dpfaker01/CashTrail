const CACHE_NAME = 'cashtrail-v1';
const BASE_PATH = '/CashTrail';

const STATIC_ASSETS = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/manifest.json`,
  `${BASE_PATH}/icon-72x72.png`,
  `${BASE_PATH}/icon-96x96.png`,
  `${BASE_PATH}/icon-128x128.png`,
  `${BASE_PATH}/icon-144x144.png`,
  `${BASE_PATH}/icon-152x152.png`,
  `${BASE_PATH}/icon-192x192.png`,
  `${BASE_PATH}/icon-384x384.png`,
  `${BASE_PATH}/icon-512x512.png`
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('CashTrail: Service Worker installing');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('CashTrail: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('CashTrail: Skip waiting');
        return self.skipWaiting();
      })
      .catch((err) => console.error('CashTrail: Cache failed', err))
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('CashTrail: Service Worker activating');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      console.log('CashTrail: Service Worker activated');
      return self.clients.claim();
    })
  );
});

// Fetch event - cache with network fallback
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip cross-origin requests
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return cached version if found
      if (cachedResponse) {
        return cachedResponse;
      }

      // Otherwise fetch from network
      return fetch(event.request).then((networkResponse) => {
        // Cache successful responses
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Offline fallback for HTML pages
        if (event.request.destination === 'document') {
          return caches.match(`${BASE_PATH}/index.html`);
        }
        // Silent fail for images
        if (event.request.destination === 'image') {
          return new Response('', { status: 204 });
        }
      });
    })
  );
});
