const CACHE = 'supper-v1';

self.addEventListener('install', e => e.waitUntil(caches.open(CACHE)));

self.addEventListener('activate', e => self.clients.claim());

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => cached ?? fetch(e.request))
  );
});
