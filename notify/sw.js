const DB_NAME = 'obsidian_personal_notify_db';
const DB_VERSION = 2;
const STORE = 'items';
const META_STORE = 'meta';
const DEFAULT_MAX_ITEMS = 30;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'k' });
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => { try { db.close(); } catch (_) {} };
      resolve(db);
    };
    req.onerror = () => reject(req.error);
  });
}

async function saveItemAndPrune(item) {
  let db = null;
  try {
    db = await openDb();
    const maxLimit = await new Promise((res) => {
      try {
        const tx = db.transaction(META_STORE, 'readonly');
        const req = tx.objectStore(META_STORE).get('maxItems');
        req.onsuccess = () => {
          const val = Number(req.result?.v);
          res(Number.isFinite(val) && val >= 5 ? val : DEFAULT_MAX_ITEMS);
        };
        req.onerror = () => res(DEFAULT_MAX_ITEMS);
      } catch (_) {
        res(DEFAULT_MAX_ITEMS);
      }
    });

    await new Promise((res, rej) => {
      const tx = db.transaction(STORE, 'readwrite');
      const st = tx.objectStore(STORE);
      st.put(item);
      const allReq = st.getAll();
      allReq.onsuccess = () => {
        const all = Array.isArray(allReq.result) ? allReq.result : [];
        const pinned = all.filter(x => Boolean(x.pinned));
        const unpinned = all.filter(x => !x.pinned).sort((a, b) => (b.ts || 0) - (a.ts || 0));
        const allowedUnpinned = Math.max(0, maxLimit - pinned.length);
        if (unpinned.length > allowedUnpinned) {
          const toDelete = unpinned.slice(allowedUnpinned);
          for (const oldIt of toDelete) {
            if (oldIt && oldIt.id) st.delete(oldIt.id);
          }
        }
      };
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  } catch (_) {
  } finally {
    try { db?.close(); } catch (_) {}
  }
}

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (ev) => ev.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = { title: '🪶 루키 알림함', body: '새 알림이 도착했습니다.', channel: '루키 알림', notePath: '', vault: '', actionKind: '', roomId: '', msgId: '' };
  try {
    if (event.data) data = Object.assign(data, event.data.json());
  } catch (_) {
    try { data.body = event.data.text(); } catch (_e) {}
  }
  const item = {
    id: 'n_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    title: data.title || '🪶 루키 알림함',
    body: data.body || '',
    channel: data.channel || '루키 알림',
    notePath: data.notePath || '',
    vault: data.vault || '',
    actionKind: data.actionKind || '',
    roomId: data.roomId || '',
    msgId: data.msgId || '',
    ts: data.ts || Date.now(),
    pinned: Boolean(data.pinned),
    pinnedAt: data.pinned ? Date.now() : 0,
    read: false
  };
  event.waitUntil((async () => {
    await saveItemAndPrune(item);
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
  const targetHash = '#focus=' + encodeURIComponent(info.id || 'latest') + '&autolaunch=1';
  event.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (list.length > 0) {
      await list[0].focus();
      list[0].postMessage({ type: 'FOCUS_ITEM', item: info, autolaunch: true });
      return;
    }
    await self.clients.openWindow('./' + targetHash);
  })());
});
