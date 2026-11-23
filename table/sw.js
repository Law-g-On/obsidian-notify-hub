self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (ev) => ev.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let d = { title: '🍽️ 루키의 식탁', body: '새 메시지가 도착했습니다.', roomId: '' };
  try {
    if (event.data) d = Object.assign(d, event.data.json());
  } catch (_) {}
  event.waitUntil(
    self.registration.showNotification(d.title || '🍽️ 루키의 식탁', {
      body: d.body || '',
      icon: './icon.svg',
      badge: './icon.svg',
      tag: 'table_' + (d.roomId || 'room') + '_' + (d.msgId || Date.now()),
      data: d
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const info = event.notification.data || {};
  const targetHash = info.roomId ? ('#room=' + encodeURIComponent(info.roomId)) : '';
  event.waitUntil((async () => {
    const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (clientsList.length > 0) {
      await clientsList[0].focus();
      clientsList[0].postMessage({ type: 'OPEN_TABLE_ROOM', roomId: info.roomId || '' });
      return;
    }
    await self.clients.openWindow('./' + targetHash);
  })());
});
