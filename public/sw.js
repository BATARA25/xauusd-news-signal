const CACHE_NAME = 'newsxleak-shell-v4';
const APP_SHELL = ['/', '/manifest.webmanifest', '/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) =>
    Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
  ).then(() => self.clients.claim()));
});

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch {}
  const bias = data.bias === 'BUY' || data.bias === 'SELL' ? data.bias : 'WAIT';
  if (bias === 'WAIT') return;

  event.waitUntil(self.registration.showNotification('NewsXLeak — XAUUSD', {
    body: bias + ' · ' + (data.eventName || 'Signal') + ' · ' + (data.confidence ?? '—') + '% confidence',
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: 'newsxleak-signal-' + (data.signalKey || bias),
    renotify: true,
    requireInteraction: true,
    data: { url: '/', signalKey: data.signalKey || '' }
  }));
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'TEST_NOTIFICATION') {
    event.waitUntil(self.registration.showNotification('NewsXLeak', {
      body: 'Background push channel is ready.',
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: 'newsxleak-test',
      data: { url: '/' }
    }));
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const client of list) if ('focus' in client) return client.focus();
    if (clients.openWindow) return clients.openWindow(event.notification.data?.url || '/');
    return undefined;
  }));
});

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
    event.respondWith(fetch(request).then((response) => {
      if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put('/', response.clone()));
      return response;
    }).catch(() => caches.match('/')));
    return;
  }

  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
    if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
    return response;
  })));
});