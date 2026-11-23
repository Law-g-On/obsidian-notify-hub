const DB_NAME = 'obsidian_personal_notify_db';
const STORE = 'items';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveItem(item) {
  try {
    const db = await openDb();
    await new Promise((res, rej) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(item);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  } catch (_) {}
}

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (ev) => ev.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = { title: '🔔 옵시디언 개인 알림', body: '새 알림이 도착했습니다.', channel: '개인 알림', notePath: '', vault: '' };
  try {
    if (event.data) data = Object.assign(data, event.data.json());
  } catch (_) {
    try { data.body = event.data.text(); } catch (_e) {}
  }
  const item = {
    id: 'n_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    title: data.title || '🔔 옵시디언 개인 알림',
    body: data.body || '',
    channel: data.channel || '개인 알림',
    notePath: data.notePath || '',
    vault: data.vault || '',
    ts: data.ts || Date.now(),
    read: false
  };
  event.waitUntil((async () => {
    await saveItem(item);
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const cl of allClients) {
      cl.postMessage({ type: 'NEW_PERSONAL_NOTIFY', item });
    }
    await self.registration.showNotification(item.title, {
      body: item.body,
      icon: './icon.svg',
      badge: './icon.svg',
      tag: item.id,
      data: item
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const info = event.notification.data || {};
  event.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (list.length > 0) {
      await list[0].focus();
      list[0].postMessage({ type: 'FOCUS_ITEM', item: info });
      return;
    }
    await self.clients.openWindow('./');
  })());
});
