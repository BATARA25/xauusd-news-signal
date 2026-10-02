const CACHE_NAME = 'newsxleak-shell-v3';
const APP_SHELL = ['/', '/manifest.webmanifest', '/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'TEST_NOTIFICATION') event.waitUntil(self.registration.showNotification('NewsXLeak', { body: 'Android alerts are enabled.', icon: '/icon.svg', badge: '/icon.svg', tag: 'newsxleak-test', data: { url: '/' } }));
  if (data.type === 'SIGNAL_ALERT' && (data.bias === 'BUY' || data.bias === 'SELL')) event.waitUntil(self.registration.showNotification('NewsXLeak — XAUUSD', { body: data.bias + ' · ' + data.eventName + ' · ' + data.confidence + '% confidence', icon: '/icon.svg', badge: '/icon.svg', tag: 'newsxleak-signal-' + data.bias, renotify: true, data: { url: '/' } }));
});

self.addEventListener('notificationclick', (event) => { event.notification.close(); event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => { for (const client of list) if ('focus' in client) return client.focus(); if (clients.openWindow) return clients.openWindow(event.notification.data?.url || '/'); return undefined; })); });

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request).catch(() => new Response(
      JSON.stringify({ ok: false, error: 'offline' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    )));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/', copy));
        }
        return response;
      }).catch(() => caches.match('/'))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});