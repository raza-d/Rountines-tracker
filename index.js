const CACHE_NAME = 'routine-cache-v4';
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

// Store scheduled alarm timeouts
const scheduledAlarms = new Map();

// Schedule alarms sent from the main page
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SCHEDULE_ALARMS') {
    const alarms = event.data.alarms || [];

    // Clear previously scheduled alarms
    scheduledAlarms.forEach((timeoutId) => clearTimeout(timeoutId));
    scheduledAlarms.clear();

    const now = Date.now();

    alarms.forEach(alarm => {
      const delay = alarm.fireAt - now;
      if (delay > 0 && delay < 24 * 60 * 60 * 1000) {
        const timeoutId = setTimeout(() => {
          self.registration.showNotification('⏰ ' + alarm.title, {
            body: alarm.timeStr + ' — tap to open and mark it done.',
            icon: './icon.png',
            badge: './icon.png',
            requireInteraction: true,
            vibrate: [400, 150, 400, 150, 400, 150, 400],
            tag: alarm.id,
            renotify: true
          });
        }, delay);
        scheduledAlarms.set(alarm.id, timeoutId);
      }
    });
  }

  if (event.data && event.data.type === 'CANCEL_ALARM') {
    const id = event.data.id;
    if (scheduledAlarms.has(id)) {
      clearTimeout(scheduledAlarms.get(id));
      scheduledAlarms.delete(id);
    }
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes('Rountines-tracker') && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow('./');
    })
  );
});
