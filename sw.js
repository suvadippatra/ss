const CACHE_NAME = 'ss-pwa-v1';
const ASSETS_TO_CACHE = [
  './',                       // index.html (alias for start_url)
  './index.html',
  './app.js',
  './manifest.json',
  // CDN scripts your app uses
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js',
  'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js'   // adjust if you use a different URL
];

// Install event: cache everything
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Caching app shell and dependencies');
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.error('Cache addAll failed:', err);
      });
    })
  );
});

// Activate event: remove old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
});

// Fetch event: cache-first strategy for all requests
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Return cached response if found; otherwise fetch from network
      return cachedResponse || fetch(event.request).then(networkResponse => {
        // Optionally cache the new request for future offline use
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      });
    })
  );
});
