// Fayda PWA Service Worker for Desktop & Mobile Standalone Installation
const CACHE_NAME = 'fayda-terminal-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Always fetch fresh network content; fall back to cache only if completely offline
  if (
    event.request.url.includes('/api/') || 
    event.request.url.includes('/ws') ||
    event.request.method !== 'GET' ||
    event.request.url.includes('/src/') ||
    event.request.url.includes('@vite') ||
    event.request.url.includes('@react')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
