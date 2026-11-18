const CACHE_NAME = 'tipidlink-v4';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Let Supabase API and WebSocket calls bypass SW cache completely
  if (url.includes('supabase.co')) {
    return;
  }

  // Network-first for HTML page navigations to guarantee latest updates
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          return response;
        })
        .catch(() => {
          return caches.match('/') || caches.match('/index.html');
        })
    );
    return;
  }

  // Cache-first with network fallback for static assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        return caches.match('/');
      });
    })
  );
});
