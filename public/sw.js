// News Radar Service Worker for Push Notifications

self.addEventListener('install', () => {
  // Activate worker immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {
    title: 'Your News Radar briefing is ready',
    body: '5 important updates · ~2 min read',
    icon: '/favicon.svg',
    badge: '/favicon-32x32.png',
    data: {
      url: '/?briefing=latest'
    }
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = Object.assign({}, data, payload);
    } catch {
      const text = event.data.text();
      if (text) data.body = text;
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/favicon.svg',
    badge: data.badge || '/favicon-32x32.png',
    tag: 'news-radar-briefing',
    renotify: true,
    data: data.data || { url: '/?briefing=latest' }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing open window if available
      for (const client of clientList) {
        if ('focus' in client) {
          if (client.url.includes(self.location.origin)) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
      }
      // Otherwise open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
