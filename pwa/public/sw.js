const CACHE = 'supper-v1';

self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE)));

self.addEventListener('activate', (e) => self.clients.claim());

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  // Never intercept API calls — let them pass through directly.
  // This is critical for SSE (/api/stream) which cannot be handled by respondWith.
  if (e.request.url.includes('/api/')) return;

  e.respondWith(caches.match(e.request).then((cached) => cached ?? fetch(e.request)));
});
