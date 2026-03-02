// ============================================================
//  SnapFlow — AUTH GUARD (Central)
//  Include dalam semua protected page SEBELUM app.js
//  <script src="auth-guard.js"></script>
// ============================================================

(function () {
    'use strict';

    // ── Konfigurasi page type ────────────────────────────────
    var PUBLIC_PAGES       = ['login.html', 'register.html', 'splash.html',
                              'forgot-password.html', 'update-password.html',
                              'offline.html', '404.html'];
    var SEMI_PUBLIC_PAGES  = ['profile.html', 'discover.html', 'search.html',
                              'shop.html', 'categories.html', 'challenge.html',
                              'product-detail.html'];
    var ADMIN_PAGES        = ['admin.html'];

    var currentPage = window.location.pathname.split('/').pop() || 'index.html';

    // Public pages — skip semua check
    if (PUBLIC_PAGES.some(function(p){ return currentPage.includes(p); })) return;

    // ── FAST CHECK: Guna localStorage cache ─────────────────
    // (synchronous — halaman tidak akan flash sebelum redirect)
    function fastSessionCheck() {
        try {
            var authKey = null;
            for (var i = 0; i < localStorage.length; i++) {
                var k = localStorage.key(i);
                if (k && k.includes('auth-token')) { authKey = k; break; }
            }
            if (!authKey) return null;
            var raw = localStorage.getItem(authKey);
            if (!raw) return null;
            var parsed = JSON.parse(raw);
            if (!parsed || !parsed.access_token) return null;
            var expiry = parsed.expires_at ? new Date(parsed.expires_at * 1000) : null;
            if (expiry && expiry <= new Date()) return null; // expired
            return parsed;
        } catch (e) { return null; }
    }

    var fastSession = fastSessionCheck();

    // ── Redirect jika tiada session (fast check) ─────────────
    if (!fastSession) {
        // Simpan URL asal untuk redirect balik selepas login
        sessionStorage.setItem('sf_redirect_after_login', window.location.href);
        window.location.replace('splash.html');
        return;
    }

    // ── Admin pages: verify dari Supabase DB ──────────────────
    // (async — selepas fast check lulus)
    if (ADMIN_PAGES.some(function(p){ return currentPage.includes(p); })) {
        // Block UI dulu sambil verify
        var adminOverlay = document.createElement('div');
        adminOverlay.id = 'admin-verify-overlay';
        adminOverlay.style.cssText = [
            'position:fixed', 'inset:0', 'background:#000',
            'z-index:99999', 'display:flex',
            'align-items:center', 'justify-content:center',
            'flex-direction:column', 'gap:12px'
        ].join(';');
        adminOverlay.innerHTML =
            '<div style="width:36px;height:36px;border:3px solid #333;border-top-color:#fe2c55;' +
            'border-radius:50%;animation:spin 0.8s linear infinite;"></div>' +
            '<p style="color:#555;font-size:13px;margin:0;">Mengesahkan akses admin...</p>' +
            '<style>@keyframes spin{to{transform:rotate(360deg)}}</style>';

        // Tambah overlay bila DOM ready
        function addAdminOverlay() {
            if (document.body) {
                document.body.appendChild(adminOverlay);
            } else {
                document.addEventListener('DOMContentLoaded', function() {
                    document.body.appendChild(adminOverlay);
                });
            }
        }
        addAdminOverlay();

        // Verify admin role dari Supabase selepas app.js load
        window.addEventListener('DOMContentLoaded', function() {
            setTimeout(function() {
                if (typeof snapSupabase === 'undefined') {
                    window.location.replace('index.html'); return;
                }
                snapSupabase.from('profiles')
                    .select('role, is_admin')
                    .eq('id', fastSession.user ? fastSession.user.id : '')
                    .single()
                    .then(function(result) {
                        var profile = result.data;
                        var isAdmin = profile && (profile.is_admin === true || profile.role === 'admin');
                        if (!isAdmin) {
                            // Bukan admin — redirect
                            document.body.innerHTML =
                                '<div style="background:#000;height:100vh;display:flex;' +
                                'flex-direction:column;align-items:center;justify-content:center;' +
                                'color:#fff;font-family:sans-serif;text-align:center;padding:20px;">' +
                                '<i class="fa-solid fa-ban" style="font-size:48px;color:#fe2c55;' +
                                'margin-bottom:16px;"></i>' +
                                '<h2 style="margin:0 0 8px;">Akses Dinafikan</h2>' +
                                '<p style="color:#555;font-size:14px;margin:0 0 24px;">' +
                                'Halaman ini hanya untuk admin SnapFlow.</p>' +
                                '<a href="index.html" style="background:#fe2c55;color:#fff;' +
                                'padding:12px 24px;border-radius:10px;font-weight:700;' +
                                'text-decoration:none;font-size:14px;">Kembali ke Utama</a></div>';
                        } else {
                            // Admin verified — remove overlay
                            var o = document.getElementById('admin-verify-overlay');
                            if (o) o.remove();
                        }
                    })
                    .catch(function() { window.location.replace('index.html'); });
            }, 500);
        });
    }

    // ── Semi-public pages: set global flag ───────────────────
    if (SEMI_PUBLIC_PAGES.some(function(p){ return currentPage.includes(p); })) {
        window._isLoggedIn = true;
        window._sfSession  = fastSession;
    }

})();
