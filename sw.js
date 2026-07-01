const CACHE_NAME = 'routine-cache-v2';
const FILES_TO_CACHE = ['./index.html', './manifest.json', './icon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((res) => res || fetch(event.request))
  );
});

// Background alarm check — fires every minute via message from main page
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CHECK_ALARMS') {
    const alarms = event.data.alarms || [];
    const now = event.data.now;
    alarms.forEach(alarm => {
      self.registration.showNotification('⏰ ' + alarm.title, {
        body: alarm.time + ' — tap to open the app and mark it done.',
        icon: './icon.png',
        badge: './icon.png',
        requireInteraction: true,
        vibrate: [400, 150, 400, 150, 400],
        tag: alarm.id
      });
    });
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('./');
    })
  );
});
