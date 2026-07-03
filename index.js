const CACHE = 'routine-v5';
const FILES = ['./index.html', './manifest.json', './icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Cache first — always serve from cache, update in background
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});

// Scheduled alarm timeouts
const scheduled = new Map();

self.addEventListener('message', e => {
  if (e.data?.type === 'SCHEDULE_ALARMS') {
    scheduled.forEach(id => clearTimeout(id));
    scheduled.clear();
    const now = Date.now();
    (e.data.alarms || []).forEach(a => {
      const delay = a.fireAt - now;
      if (delay > 0 && delay < 86400000) {
        const tid = setTimeout(() => {
          self.registration.showNotification('⏰ ' + a.title, {
            body: a.timeStr + ' — tap to open the app.',
            icon: './icon.png',
            badge: './icon.png',
            requireInteraction: true,
            vibrate: [400, 150, 400, 150, 400],
            tag: a.id,
            renotify: true
          });
        }, delay);
        scheduled.set(a.id, tid);
      }
    });
  }

  if (e.data?.type === 'CANCEL_ALARM') {
    if (scheduled.has(e.data.id)) {
      clearTimeout(scheduled.get(e.data.id));
      scheduled.delete(e.data.id);
    }
  }
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes('Rountines-tracker') && 'focus' in c) return c.focus();
      }
      return clients.openWindow('./');
    })
  );
});
