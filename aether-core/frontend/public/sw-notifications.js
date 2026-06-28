/* eslint-disable no-restricted-globals */
/** Service worker for optional web push notifications (Phase 6). */

self.addEventListener('push', (event) => {
  let payload = { title: 'AETHER', body: '', href: '/', id: '' };
  try {
    if (event.data) {
      payload = { ...payload, ...JSON.parse(event.data.text()) };
    }
  } catch {
    /* ignore malformed payload */
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: payload.id || undefined,
      data: { href: payload.href, id: payload.id },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const href = event.notification.data?.href ?? '/notifications';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(href);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(href);
      }
      return undefined;
    }),
  );
});
