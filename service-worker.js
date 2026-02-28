// ============================================================
//  SNAPFLOW SERVICE WORKER
//  Strategi: Cache-first untuk aset statik,
//            Network-first untuk API Supabase
// ============================================================

const CACHE_NAME    = 'snapflow-v1';
const DYNAMIC_CACHE = 'snapflow-dynamic-v1';

// Fail yang di-cache semasa install
const STATIC_ASSETS = [
    '/index.html',
    '/splash.html',
    '/login.html',
    '/register.html',
    '/discover.html',
    '/upload.html',
    '/inbox.html',
    '/profile.html',
    '/shop.html',
    '/cart.html',
    '/chat.html',
    '/edit-profile.html',
    '/forgot-password.html',
    '/style.css',
    '/app.js',
    '/manifest.json',
];

// ── INSTALL: Pre-cache semua aset statik ─────────
self.addEventListener('install', (event) => {
    console.log('[SW] Installing SnapFlow Service Worker...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Pre-caching static assets');
            // Guna addAll dengan try-catch supaya fail partial tidak block install
            return Promise.allSettled(
                STATIC_ASSETS.map(url =>
                    cache.add(url).catch(err =>
                        console.warn(`[SW] Gagal cache: ${url}`, err)
                    )
                )
            );
        }).then(() => self.skipWaiting())
    );
});

// ── ACTIVATE: Buang cache lama ───────────────────
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating SnapFlow Service Worker...');
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME && key !== DYNAMIC_CACHE)
                    .map(key => {
                        console.log('[SW] Buang cache lama:', key);
                        return caches.delete(key);
                    })
            );
        }).then(() => self.clients.claim())
    );
});

// ── FETCH: Strategi caching ──────────────────────
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip request bukan GET
    if (request.method !== 'GET') return;

    // ── Supabase API: Network-first ──────────────
    // Sentiasa ambil data terbaru dari server
    if (url.hostname.includes('supabase.co')) {
        event.respondWith(networkFirst(request));
        return;
    }

    // ── CDN eksternal (Font Awesome, Google Fonts): Cache-first ──
    if (url.hostname.includes('cdnjs.cloudflare.com') ||
        url.hostname.includes('fonts.googleapis.com') ||
        url.hostname.includes('fonts.gstatic.com') ||
        url.hostname.includes('cdn.jsdelivr.net')) {
        event.respondWith(cacheFirst(request));
        return;
    }

    // ── Aset statik tempatan: Cache-first ────────
    if (url.origin === self.location.origin) {
        event.respondWith(cacheFirst(request));
        return;
    }

    // ── Lain-lain: Network dengan fallback ───────
    event.respondWith(networkWithFallback(request));
});

// ── Strategi: Cache-first ────────────────────────
// Cuba dari cache dulu, jika tiada baru ambil dari network
async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    } catch (err) {
        return offlineFallback(request);
    }
}

// ── Strategi: Network-first ──────────────────────
// Cuba ambil dari network dulu, jika gagal guna cache
async function networkFirst(request) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    } catch (err) {
        const cached = await caches.match(request);
        if (cached) return cached;
        return offlineFallback(request);
    }
}

// ── Strategi: Network dengan fallback ────────────
async function networkWithFallback(request) {
    try {
        return await fetch(request);
    } catch (err) {
        const cached = await caches.match(request);
        if (cached) return cached;
        return offlineFallback(request);
    }
}

// ── Halaman offline fallback ─────────────────────
function offlineFallback(request) {
    const url = new URL(request.url);

    // Jika HTML page — tunjuk halaman offline
    if (request.destination === 'document') {
        return new Response(`
            <!DOCTYPE html>
            <html lang="ms">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>SnapFlow — Tiada Sambungan</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        background: #000; color: #fff;
                        display: flex; align-items: center; justify-content: center;
                        height: 100vh; flex-direction: column; gap: 20px;
                        font-family: 'Outfit', system-ui, sans-serif;
                        text-align: center; padding: 30px;
                    }
                    .logo { font-size: 32px; font-weight: 800;
                        background: linear-gradient(to right, #fff, #fe2c55);
                        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
                        background-clip: text;
                    }
                    .icon { font-size: 56px; margin-bottom: 8px; }
                    h2 { font-size: 20px; font-weight: 700; }
                    p { font-size: 14px; color: #555; line-height: 1.6; max-width: 280px; }
                    button {
                        margin-top: 10px;
                        background: #fe2c55; color: #fff; border: none;
                        padding: 13px 32px; border-radius: 10px;
                        font-size: 15px; font-weight: 700; cursor: pointer;
                    }
                </style>
            </head>
            <body>
                <p class="logo">SnapFlow</p>
                <div>
                    <div class="icon">📡</div>
                    <h2>Tiada Sambungan Internet</h2>
                </div>
                <p>Sila semak sambungan internet anda dan cuba lagi.</p>
                <button onclick="window.location.reload()">Cuba Semula</button>
            </body>
            </html>
        `, {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
            status: 503
        });
    }

    // Untuk aset lain — return response kosong
    return new Response('', { status: 408 });
}

// ── Push Notification (asas) ─────────────────────
self.addEventListener('push', (event) => {
    if (!event.data) return;

    let data;
    try {
        data = event.data.json();
    } catch {
        data = { title: 'SnapFlow', body: event.data.text() };
    }

    const options = {
        body: data.body || 'Anda ada notifikasi baru',
        icon: 'https://ui-avatars.com/api/?name=SF&background=fe2c55&color=fff&size=192',
        badge: 'https://ui-avatars.com/api/?name=SF&background=fe2c55&color=fff&size=72',
        vibrate: [100, 50, 100],
        data: { url: data.url || '/inbox.html' },
        actions: [
            { action: 'view', title: 'Lihat', icon: '' },
            { action: 'close', title: 'Tutup', icon: '' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'SnapFlow', options)
    );
});

// ── Klik pada notifikasi ─────────────────────────
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const urlToOpen = event.notification.data?.url || '/index.html';

    if (event.action === 'close') return;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Jika app dah terbuka — focus dan navigate
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.focus();
                    client.navigate(urlToOpen);
                    return;
                }
            }
            // Jika app belum buka — buka tab baru
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

// ── Background Sync (untuk upload offline) ───────
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-uploads') {
        console.log('[SW] Background sync: upload yang tertunda...');
        // Boleh implement offline upload queue di sini
    }
});

console.log('[SW] SnapFlow Service Worker loaded ✅');
