importScripts('/pdf-share.js');

const CACHE = 'supper-v1';

self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE)));

self.addEventListener('activate', (e) => e.waitUntil(Promise.all([self.clients.claim(), self.WfsPdfShare.cleanup().catch(() => {})])));

self.addEventListener('fetch', (e) => {
  if (self.WfsPdfShare.matches(e.request)) {
    e.respondWith(self.WfsPdfShare.handle(e.request));
    return;
  }
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).pathname === '/manifest.json') return;

  // Never intercept API calls — let them pass through directly.
  // This is critical for SSE (/api/stream) which cannot be handled by respondWith.
  if (e.request.url.includes('/api/')) return;

  e.respondWith(caches.match(e.request).then((cached) => cached ?? fetch(e.request)));
});

