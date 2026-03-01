// ============================================================
//  SNAPFLOW SERVICE WORKER v3
//  FIX: skipWaiting, clients.claim, versioned cache
// ============================================================

const SW_VERSION    = 'v3.0.0';
const CACHE_STATIC  = `snapflow-static-${SW_VERSION}`;
const CACHE_DYNAMIC = `snapflow-dynamic-${SW_VERSION}`;

const STATIC_ASSETS = [
    '/', '/index.html', '/splash.html', '/login.html', '/register.html',
    '/discover.html', '/upload.html', '/inbox.html', '/profile.html',
    '/shop.html', '/cart.html', '/chat.html', '/edit-profile.html',
    '/forgot-password.html', '/followers.html', '/playlist.html',
    '/admin.html', '/saved.html', '/404.html', '/offline.html',
    '/challenge.html', '/live.html', '/activity-log.html',
    '/search.html', '/analytics.html', '/editor.html', '/duet.html',
    '/collections.html', '/categories.html', '/orders.html',
    '/style.css', '/app.js', '/manifest.json',
];

const NEVER_CACHE = [
    'supabase.co', 'anthropic.com', 'openai.com',
    'stripe.com', 'fonts.googleapis.com', '/service-worker.js',
];

// INSTALL
self.addEventListener('install', (event) => {
    console.log(`[SW ${SW_VERSION}] Installing...`);
    event.waitUntil(
        caches.open(CACHE_STATIC)
            .then(cache => Promise.allSettled(
                STATIC_ASSETS.map(url => cache.add(url).catch(e =>
                    console.warn(`[SW] Skip: ${url}`, e.message)
                ))
            ))
            .then(() => {
                console.log(`[SW ${SW_VERSION}] Installed`);
                return self.skipWaiting(); // ✅ FIX: Aktif serta-merta
            })
    );
});

// ACTIVATE
self.addEventListener('activate', (event) => {
    console.log(`[SW ${SW_VERSION}] Activating...`);
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(k => k !== CACHE_STATIC && k !== CACHE_DYNAMIC)
                    .map(k => { console.log(`[SW] Padam cache lama: ${k}`); return caches.delete(k); })
            ))
            .then(() => self.clients.claim()) // ✅ FIX: Kawal semua tab
            .then(() => console.log(`[SW ${SW_VERSION}] Active`))
    );
});

// FETCH
self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (!req.url.startsWith('http')) return;
    if (req.method !== 'GET') return;
    if (NEVER_CACHE.some(p => req.url.includes(p))) {
        event.respondWith(fetch(req).catch(() => new Response('', {status:503})));
        return;
    }

    const isHtml = req.headers.get('accept')?.includes('text/html') || req.url.endsWith('.html');

    if (isHtml) {
        // Network first untuk HTML
        event.respondWith(
            fetch(req)
                .then(res => {
                    if (res.ok) caches.open(CACHE_DYNAMIC).then(c => c.put(req, res.clone()));
                    return res;
                })
                .catch(() => caches.match(req).then(c => c || caches.match('/offline.html')))
        );
    } else {
        // Cache first untuk CSS/JS/images
        event.respondWith(
            caches.match(req).then(cached => cached || fetch(req).then(res => {
                if (res.ok) caches.open(CACHE_DYNAMIC).then(c => c.put(req, res.clone()));
                return res;
            })).catch(() => new Response('', {status:503}))
        );
    }
});

// MESSAGE dari UI
self.addEventListener('message', (event) => {
    if (event.data === 'SKIP_WAITING') self.skipWaiting();
    if (event.data === 'GET_VERSION') event.ports[0]?.postMessage({version: SW_VERSION});
});
