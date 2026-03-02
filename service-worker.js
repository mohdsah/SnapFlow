// ============================================================
//  SnapFlow — Service Worker v4.0.0
//  - Versioned cache (bump SW_VERSION untuk force update)
//  - Update notification popup
//  - Offline fallback
//  - Background sync ready
// ============================================================

const SW_VERSION    = 'v4.0.0';
const CACHE_STATIC  = `snapflow-static-${SW_VERSION}`;
const CACHE_DYNAMIC = `snapflow-dynamic-${SW_VERSION}`;

// Files untuk pre-cache (static shell)
const STATIC_FILES = [
    '/',
    '/index.html',
    '/login.html',
    '/register.html',
    '/splash.html',
    '/offline.html',
    '/app.js',
    '/auth-guard.js',
    '/style.css',
    '/manifest.json',
];

// ── INSTALL ──────────────────────────────────────────────────
self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_STATIC)
            .then(function(cache) {
                // Pre-cache fail kritikal sahaja
                return cache.addAll(STATIC_FILES).catch(function(err) {
                    // Jangan gagal install jika satu file tidak ada
                    console.warn('[SW] Pre-cache partial:', err.message);
                });
            })
            .then(function() {
                // Aktif serta-merta tanpa tunggu tab lama tutup
                return self.skipWaiting();
            })
    );
});

// ── ACTIVATE ─────────────────────────────────────────────────
self.addEventListener('activate', function(event) {
    event.waitUntil(
        // Padam cache versi lama
        caches.keys()
            .then(function(keys) {
                return Promise.all(
                    keys.filter(function(key) {
                        return key !== CACHE_STATIC && key !== CACHE_DYNAMIC;
                    }).map(function(key) {
                        return caches.delete(key);
                    })
                );
            })
            .then(function() {
                // Kawal semua tab serta-merta
                return self.clients.claim();
            })
            .then(function() {
                // Beritahu semua tab: ada update baru
                return self.clients.matchAll({ type: 'window' });
            })
            .then(function(clients) {
                clients.forEach(function(client) {
                    client.postMessage({ type: 'SW_UPDATED', version: SW_VERSION });
                });
            })
    );
});

// ── FETCH — Cache Strategy ────────────────────────────────────
self.addEventListener('fetch', function(event) {
    var url = new URL(event.request.url);

    // Skip non-GET dan Supabase/Stripe requests (jangan cache)
    if (event.request.method !== 'GET') return;
    if (url.hostname.includes('supabase.co')) return;
    if (url.hostname.includes('stripe.com'))  return;
    if (url.hostname.includes('jsdelivr.net')) return; // CDN — biar browser cache

    // HTML pages — Network First (content sentiasa terkini)
    if (event.request.headers.get('accept') &&
        event.request.headers.get('accept').includes('text/html')) {
        event.respondWith(networkFirst(event.request));
        return;
    }

    // Assets (JS, CSS, images) — Cache First
    event.respondWith(cacheFirst(event.request));
});

// Network First: Cuba network, fallback ke cache, fallback ke offline
async function networkFirst(request) {
    try {
        var response = await fetch(request);
        if (response && response.status === 200) {
            var cache = await caches.open(CACHE_DYNAMIC);
            cache.put(request, response.clone());
        }
        return response;
    } catch (err) {
        var cached = await caches.match(request);
        return cached || caches.match('/offline.html');
    }
}

// Cache First: Cuba cache, fallback ke network
async function cacheFirst(request) {
    var cached = await caches.match(request);
    if (cached) return cached;
    try {
        var response = await fetch(request);
        if (response && response.status === 200) {
            var cache = await caches.open(CACHE_DYNAMIC);
            cache.put(request, response.clone());
        }
        return response;
    } catch (err) {
        return caches.match('/offline.html');
    }
}

// ── MESSAGES dari app ─────────────────────────────────────────
self.addEventListener('message', function(event) {
    if (event.data === 'SKIP_WAITING')    self.skipWaiting();
    if (event.data === 'GET_VERSION')     event.ports[0]?.postMessage({ version: SW_VERSION });
    if (event.data === 'CLEAR_CACHE') {
        caches.keys().then(function(keys) {
            return Promise.all(keys.map(function(k) { return caches.delete(k); }));
        });
    }
});

// ── BACKGROUND SYNC (untuk future: offline actions) ──────────
self.addEventListener('sync', function(event) {
    if (event.tag === 'sync-likes') {
        event.waitUntil(syncPendingLikes());
    }
    if (event.tag === 'sync-comments') {
        event.waitUntil(syncPendingComments());
    }
});

async function syncPendingLikes() {
    // Placeholder — implement bila ada IndexedDB offline queue
    return Promise.resolve();
}
async function syncPendingComments() {
    return Promise.resolve();
}

// ── PUSH NOTIFICATIONS ────────────────────────────────────────
self.addEventListener('push', function(event) {
    if (!event.data) return;
    var data = {};
    try { data = event.data.json(); } catch(e) { data = { title: 'SnapFlow', body: event.data.text() }; }

    event.waitUntil(
        self.registration.showNotification(data.title || 'SnapFlow', {
            body:    data.body    || 'Ada notifikasi baharu',
            icon:    data.icon    || 'https://ui-avatars.com/api/?name=SF&background=fe2c55&color=fff&size=192',
            badge:   data.badge   || 'https://ui-avatars.com/api/?name=SF&background=fe2c55&color=fff&size=72',
            data:    data.url     || '/',
            vibrate: [200, 100, 200],
            actions: [
                { action: 'open',    title: 'Buka'   },
                { action: 'dismiss', title: 'Tutup'  }
            ]
        })
    );
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    if (event.action === 'dismiss') return;
    var url = event.notification.data || '/';
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(function(windowClients) {
            for (var i = 0; i < windowClients.length; i++) {
                if (windowClients[i].url === url && 'focus' in windowClients[i]) {
                    return windowClients[i].focus();
                }
            }
            if (clients.openWindow) return clients.openWindow(url);
        })
    );
});
