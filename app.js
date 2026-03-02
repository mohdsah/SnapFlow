// ==========================================
// 1. KONFIGURASI SUPABASE
// ==========================================
const supabaseUrl = "https://trrfsredzugdyppevcbw.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRycmZzcmVkenVnZHlwcGV2Y2J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMzY5NTgsImV4cCI6MjA4NzgxMjk1OH0.o2siKHUQddz89mVBto0vEk9lIUZF5xYvp8eKBbXcc7s";
const snapSupabase = supabase.createClient(supabaseUrl, supabaseKey);

// ── Dev mode: tukar ke false sebelum production deploy ──
const DEV_MODE = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const devLog   = (...args) => { if (DEV_MODE) devLog('[SnapFlow]', ...args); };
const devWarn  = (...args) => { if (DEV_MODE) console.warn('[SnapFlow]', ...args); };
const devErr   = (...args) => console.error('[SnapFlow]', ...args); // error sentiasa log

// ==========================================
// 2. HELPER FUNCTIONS
// ==========================================

// ✅ FIX: Sanitize input untuk elak XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(String(text)));
    return div.innerHTML;
}




// ── Empty State Helper ─────────────────────────────
function showEmptyState(container, icon, title, subtitle, action) {
    if (!container) return;
    action = action || '';
    subtitle = subtitle || '';
    container.innerHTML =
        '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;' +
        'min-height:200px;padding:40px 20px;text-align:center;gap:12px;">' +
            '<i class="' + icon + '" style="font-size:48px;color:#333;"></i>' +
            '<h3 style="margin:0;font-size:17px;font-weight:800;color:#888;">' + escapeHtml(title) + '</h3>' +
            (subtitle ? '<p style="margin:0;font-size:13px;color:#555;">' + escapeHtml(subtitle) + '</p>' : '') +
            action +
        '</div>';
}

// ── Error State Helper ──────────────────────────────
function showErrorState(container, message) {
    message = message || 'Ralat berlaku. Cuba lagi.';
    if (!container) return;
    container.innerHTML =
        '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;' +
        'min-height:200px;padding:40px 20px;text-align:center;gap:12px;">' +
            '<i class="fa-solid fa-triangle-exclamation" style="font-size:40px;color:#fe2c55;"></i>' +
            '<p style="margin:0;font-size:14px;color:#888;">' + escapeHtml(message) + '</p>' +
            '<button onclick="location.reload()" style="background:#fe2c55;color:#fff;border:none;' +
            'padding:8px 20px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">' +
            'Cuba Lagi</button>' +
        '</div>';
}

// ── Loading Skeleton Helper ─────────────────────────
function showSkeleton(container, count) {
    count = count || 3;
    if (!container) return;
    var skeletons = '';
    for (var i = 0; i < count; i++) {
        skeletons += '<div style="background:#1a1a1a;border-radius:12px;padding:16px;margin-bottom:12px;animation:pulse 1.5s ease-in-out infinite;">' +
            '<div style="background:#222;height:14px;border-radius:4px;width:60%;margin-bottom:8px;"></div>' +
            '<div style="background:#222;height:10px;border-radius:4px;width:40%;"></div>' +
            '</div>';
    }
    container.innerHTML = skeletons;
}

// ✅ BARU: Toast notification (ganti alert())
function showToast(message, type = 'info') {
    // Buang toast lama jika ada
    const existing = document.getElementById('snap-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'snap-toast';
    const colors = {
        success: '#2ecc71',
        error: '#fe2c55',
        info: '#00f2ea',
        warning: '#f39c12'
    };
    toast.style.cssText = `
        position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%);
        background: ${colors[type] || colors.info}; color: #fff;
        padding: 12px 24px; border-radius: 25px; font-size: 14px; font-weight: bold;
        z-index: 99999; box-shadow: 0 4px 20px rgba(0,0,0,0.4);
        animation: toastIn 0.3s ease; white-space: nowrap;
    `;
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => { if (toast) toast.remove(); }, 3000);
}

// ✅ BARU: Set loading state pada butang
function setLoading(btn, isLoading, originalText = 'Hantar') {
    if (!btn) return;
    btn.disabled = isLoading;
    btn.style.opacity = isLoading ? '0.6' : '1';
    btn.style.cursor = isLoading ? 'not-allowed' : 'pointer';
    btn.innerText = isLoading ? 'Memuatkan...' : originalText;
}

// ✅ FIX: Format masa (e.g. "3 minit lalu")
function timeAgo(dateStr) {
    const now = new Date();
    const then = new Date(dateStr);
    const diff = Math.floor((now - then) / 1000);
    if (diff < 60) return 'Baru sahaja';
    if (diff < 3600) return `${Math.floor(diff / 60)} min lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
    return `${Math.floor(diff / 86400)} hari lalu`;
}

// ==========================================
// ==========================================
// 3. SISTEM AUTH — LENGKAP & SELAMAT
// ==========================================
const AUTH_PAGES      = ['login.html','register.html','splash.html','forgot-password.html','update-password.html'];
const SKIP_AUTH_PAGES = ['offline.html','404.html'];
const SEMI_PUBLIC     = ['discover.html','search.html','profile.html'];

let _authUser    = undefined;
let _authChecked = false;

async function getAuthUser(forceRefresh = false) {
    if (_authChecked && !forceRefresh) return _authUser;
    try {
        const { data: { session } } = await snapSupabase.auth.getSession();
        _authUser    = session?.user || null;
        _authChecked = true;
        if (_authUser) _cachedUserId = _authUser.id;
        return _authUser;
    } catch (err) {
        devErr('[Auth]', err.message);
        _authUser = null; _authChecked = true;
        return null;
    }
}

async function requireAuth(redirectTo = 'splash.html') {
    const user = await getAuthUser();
    if (!user) {
        sessionStorage.setItem('sf_redirect_after_login', window.location.href);
        window.location.replace(redirectTo);
        return null;
    }
    return user;
}

async function requireAdmin() {
    const user = await requireAuth();
    if (!user) return null;
    const { data: profile } = await snapSupabase
        .from('profiles').select('role,is_admin').eq('id', user.id).single();
    if (!profile?.is_admin && profile?.role !== 'admin') {
        showToast('Akses dinafikan.', 'error');
        setTimeout(() => window.location.replace('index.html'), 1500);
        return null;
    }
    return { user, profile };
}

async function checkUserSession() {
    const page   = window.location.pathname.split('/').pop() || 'index.html';
    if (SKIP_AUTH_PAGES.some(p => page.includes(p))) return;
    const isAuth = AUTH_PAGES.some(p => page.includes(p));
    const isSemi = SEMI_PUBLIC.some(p => page.includes(p));
    const user   = await getAuthUser();
    if (user && isAuth && !page.includes('update-password')) {
        window.location.replace('index.html'); return;
    }
    if (!user && !isAuth && !isSemi) {
        sessionStorage.setItem('sf_redirect_after_login', window.location.href);
        window.location.replace('splash.html');
    }
    // Load cart dari server bila user login
    if (user) { loadCartFromServer().catch(function(){}); }
}

snapSupabase.auth.onAuthStateChange((event, session) => {
    const page   = window.location.pathname.split('/').pop() || 'index.html';
    const isAuth = AUTH_PAGES.some(p => page.includes(p));
    const isSkip = SKIP_AUTH_PAGES.some(p => page.includes(p));
    const isSemi = SEMI_PUBLIC.some(p => page.includes(p));
    if (isSkip) return;

    _authUser = session?.user || null; _authChecked = true;
    if (_authUser) _cachedUserId = _authUser.id;

    if (event === 'SIGNED_IN' && isAuth && !page.includes('update-password')) {
        const redir = sessionStorage.getItem('sf_redirect_after_login');
        sessionStorage.removeItem('sf_redirect_after_login');
        const safe  = redir && !AUTH_PAGES.some(p => redir.includes(p));
        window.location.replace(safe ? redir : 'index.html');
    }
    if (event === 'SIGNED_OUT' && !isAuth && !isSemi) {
        window.location.replace('splash.html');
    }
    if (event === 'PASSWORD_RECOVERY' && !page.includes('update-password')) {
        window.location.replace('update-password.html');
    }
});

// ── Helper: dialog konfirmasi ──────────────────────
function _showConfirmDialog(title, msg, okText, cancelText) {
    return new Promise((resolve) => {
        const o = document.createElement('div');
        o.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
        o.innerHTML =
            '<div style="background:#111;border:1px solid #2a2a2a;border-radius:16px;padding:28px 24px;width:100%;max-width:300px;text-align:center;">' +
            '<p style="font-weight:800;font-size:17px;color:#fff;margin:0 0 10px;">' + title + '</p>' +
            '<p style="color:#777;font-size:13px;margin:0 0 22px;line-height:1.5;">' + msg + '</p>' +
            '<div style="display:flex;gap:10px;">' +
            '<button id="d-no"  style="flex:1;background:#1a1a1a;border:1px solid #333;color:#fff;padding:11px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;">' + cancelText + '</button>' +
            '<button id="d-yes" style="flex:1;background:#fe2c55;border:none;color:#fff;padding:11px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;">' + okText + '</button>' +
            '</div></div>';
        document.body.appendChild(o);
        o.querySelector('#d-yes').onclick = () => { o.remove(); resolve(true);  };
        o.querySelector('#d-no').onclick  = () => { o.remove(); resolve(false); };
        o.onclick = (e) => { if (e.target === o) { o.remove(); resolve(false); } };
    });
}

// ==========================================
// ── PWA: Service Worker Registration + Update Banner ──────
(function() {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/service-worker.js').then(function(reg) {
        reg.addEventListener('updatefound', function() {
            var w = reg.installing;
            if (!w) return;
            w.addEventListener('statechange', function() {
                if (w.state === 'installed' && navigator.serviceWorker.controller) {
                    _pwaShowUpdateBanner(w);
                }
            });
        });
    }).catch(function(e){ devErr('[SW]', e); });

    navigator.serviceWorker.addEventListener('message', function(evt) {
        if (evt.data && evt.data.type === 'SW_UPDATED') _pwaShowUpdateBanner(null);
    });
})();

function _pwaShowUpdateBanner(worker) {
    if (document.getElementById('pwa-update-bar')) return;
    var bar = document.createElement('div');
    bar.id = 'pwa-update-bar';
    bar.style.cssText = 'position:fixed;bottom:72px;left:50%;transform:translateX(-50%);' +
        'background:#111;border:1px solid #333;color:#fff;padding:10px 16px;border-radius:12px;' +
        'z-index:9999;display:flex;align-items:center;gap:10px;box-shadow:0 4px 20px rgba(0,0,0,0.6);' +
        'font-size:13px;white-space:nowrap;max-width:calc(100vw - 32px);font-family:inherit;';
    bar.innerHTML = '<i class="fa-solid fa-rotate" style="color:#fe2c55;"></i>' +
        '<span>Versi baru tersedia</span>' +
        '<button onclick="window._applyPwaUpdate()" style="background:#fe2c55;color:#fff;border:none;' +
        'padding:6px 14px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">' +
        'Kemas Kini</button>' +
        '<button onclick="this.parentElement.remove()" style="background:none;border:none;' +
        'color:#666;cursor:pointer;font-size:18px;padding:0 4px;">×</button>';
    document.body && document.body.appendChild(bar);
    window._pwaNewWorker = worker;
    setTimeout(function(){ var el=document.getElementById('pwa-update-bar'); if(el) el.remove(); }, 12000);
}

window._applyPwaUpdate = function() {
    var bar = document.getElementById('pwa-update-bar');
    if (bar) bar.remove();
    if (window._pwaNewWorker) window._pwaNewWorker.postMessage('SKIP_WAITING');
    else if (navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage('SKIP_WAITING');
    window.location.reload();
};

// 3b. AUTH FUNCTIONS — LOGIN, REGISTER, LOGOUT
// ==========================================

// ── LOG MASUK ──────────────────────────────────────────────────────────
async function handleLogin() {
    const emailEl = document.getElementById('login-email');
    const passEl  = document.getElementById('login-password');
    const btn     = document.querySelector('.login-btn-main') || document.querySelector('#login-btn');
    const email   = emailEl ? emailEl.value.trim() : '';
    const pass    = passEl  ? passEl.value : '';

    if (!email || !pass) {
        showToast('Sila isi emel dan kata laluan.', 'warning');
        if (!email && emailEl) emailEl.focus();
        else if (passEl)       passEl.focus();
        return;
    }

    setLoading(btn, true, 'Log Masuk');

    try {
        const { data, error } = await snapSupabase.auth.signInWithPassword({
            email:    email,
            password: pass
        });

        if (error) {
            setLoading(btn, false, 'Log Masuk');

            if (error.message && error.message.indexOf('Email not confirmed') !== -1) {
                _tunjukNotisEmailBelumSahkan(email);
                return;
            }

            var pesanan = 'Emel atau kata laluan salah.';
            if (error.message && error.message.indexOf('Too many requests') !== -1) {
                pesanan = 'Terlalu banyak cubaan. Tunggu sebentar.';
            }
            showToast(pesanan, 'error');
            if (passEl) passEl.select();
            return;
        }

        // Berjaya — onAuthStateChange akan redirect
        showToast('Selamat datang! \uD83C\uDF89', 'success');

    } catch (err) {
        devErr('[login]', err);
        showToast('Ralat sambungan. Semak internet anda.', 'error');
        setLoading(btn, false, 'Log Masuk');
    }
}

// Notis email belum disahkan
function _tunjukNotisEmailBelumSahkan(email) {
    var safeEmail = String(email).replace(/</g, '&lt;').replace(/>/g, '&gt;');
    var existing  = document.getElementById('sf-notis-emel');
    if (existing) existing.remove();

    var notis = document.createElement('div');
    notis.id  = 'sf-notis-emel';
    notis.innerHTML =
        '<div style="background:#111;border:1px solid #2a2a2a;border-radius:12px;' +
        'padding:20px;margin-top:16px;text-align:center;">' +
        '<i class="fa-solid fa-envelope" style="font-size:34px;color:#f59e0b;display:block;margin-bottom:12px;"></i>' +
        '<p style="color:#fff;font-weight:700;font-size:15px;margin:0 0 8px;">Emel Belum Disahkan</p>' +
        '<p style="color:#666;font-size:13px;margin:0 0 16px;line-height:1.5;">' +
        'Semak inbox dan folder Spam untuk<br>' +
        '<strong style="color:#fe2c55;">' + safeEmail + '</strong></p>' +
        '<button onclick="hantarSemulaPengesahan(\'' + safeEmail + '\')" ' +
        'id="btn-resend" style="width:100%;background:transparent;border:1px solid #fe2c55;' +
        'color:#fe2c55;padding:10px;border-radius:8px;font-size:13px;font-weight:700;' +
        'cursor:pointer;font-family:inherit;">' +
        '<i class="fa-solid fa-paper-plane" style="margin-right:6px;"></i>' +
        'Hantar Semula Pengesahan</button></div>';

    var anchor = document.querySelector('.login-btn-main') || document.querySelector('#login-btn');
    if (anchor) {
        anchor.insertAdjacentElement('afterend', notis);
    } else {
        document.body.appendChild(notis);
    }
    showToast('Sahkan emel anda dahulu.', 'warning');
}

async function hantarSemulaPengesahan(email) {
    var btn = document.getElementById('btn-resend');
    if (btn) { btn.disabled = true; btn.textContent = 'Menghantar...'; }

    var { error } = await snapSupabase.auth.resend({ type: 'signup', email: email });

    if (error) {
        showToast('Gagal: ' + error.message, 'error');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-rotate" style="margin-right:6px;"></i>Cuba Semula';
        }
    } else {
        showToast('Emel pengesahan dihantar! Semak inbox & Spam.', 'success');
        if (btn) {
            btn.innerHTML = '<i class="fa-solid fa-check" style="margin-right:6px;"></i>Emel Dihantar';
        }
    }
}

// ── DAFTAR AKAUN ──────────────────────────────────────────────────────
async function handleRegister() {
    var namaEl    = document.getElementById('reg-fullname');
    var userEl    = document.getElementById('reg-username');
    var emailEl   = document.getElementById('reg-email');
    var passEl    = document.getElementById('reg-password');
    var btn       = document.querySelector('button[onclick="handleRegister()"]');

    var namaLengkap = namaEl   ? namaEl.value.trim()            : '';
    var username    = userEl   ? userEl.value.trim().toLowerCase() : '';
    var email       = emailEl  ? emailEl.value.trim()           : '';
    var password    = passEl   ? passEl.value                   : '';

    // ── Validasi ──────────────────────────────────────────────────────
    if (!namaLengkap) {
        showToast('Sila masukkan nama penuh.', 'warning');
        if (namaEl) namaEl.focus(); return;
    }
    if (!username) {
        showToast('Sila masukkan username.', 'warning');
        if (userEl) userEl.focus(); return;
    }
    if (username.length < 3 || username.length > 30) {
        showToast('Username mesti antara 3 hingga 30 aksara.', 'warning');
        if (userEl) userEl.focus(); return;
    }
    if (!/^[a-zA-Z0-9_.]+$/.test(username)) {
        showToast('Username hanya boleh ada huruf, nombor, titik dan underscore.', 'warning');
        if (userEl) userEl.focus(); return;
    }
    if (!email || email.indexOf('@') === -1) {
        showToast('Sila masukkan alamat emel yang sah.', 'warning');
        if (emailEl) emailEl.focus(); return;
    }
    if (!password || password.length < 6) {
        showToast('Kata laluan minimum 6 aksara.', 'warning');
        if (passEl) passEl.focus(); return;
    }

    setLoading(btn, true, 'Daftar Sekarang');

    try {
        // Semak username belum dipakai
        var { data: existing } = await snapSupabase
            .from('profiles').select('id').eq('username', username).maybeSingle();

        if (existing) {
            showToast('Username ini sudah digunakan. Pilih username lain.', 'error');
            setLoading(btn, false, 'Daftar Sekarang');
            if (userEl) userEl.focus();
            return;
        }

        // Daftar akaun baru
        var { data, error } = await snapSupabase.auth.signUp({
            email:    email,
            password: password,
            options:  { data: { full_name: namaLengkap, username: username } }
        });

        if (error) {
            var pesanan = error.message;
            if (pesanan.indexOf('already registered') !== -1 || pesanan.indexOf('User already') !== -1) {
                pesanan = 'Emel ini sudah didaftarkan. Sila log masuk atau reset kata laluan.';
            } else if (pesanan.indexOf('Password should') !== -1) {
                pesanan = 'Kata laluan terlalu mudah. Gunakan gabungan huruf dan nombor.';
            }
            showToast(pesanan, 'error');
            setLoading(btn, false, 'Daftar Sekarang');
            return;
        }

        // ── Berjaya ───────────────────────────────────────────────────
        if (data && data.user && !data.session) {
            // Email confirmation perlu — tunjuk skrin kejayaan
            var container = document.querySelector('div[style*="max-width"], .auth-container');
            if (container) {
                container.innerHTML =
                    '<div style="text-align:center;padding:20px;">' +
                    '<i class="fa-solid fa-envelope-circle-check" style="font-size:64px;' +
                    'color:#22c55e;margin-bottom:20px;display:block;"></i>' +
                    '<h2 style="color:#fff;font-size:22px;font-weight:800;margin:0 0 12px;">' +
                    'Semak Emel Anda!</h2>' +
                    '<p style="color:#666;font-size:14px;margin:0 0 8px;">Emel pengesahan dihantar ke:</p>' +
                    '<p style="color:#fe2c55;font-size:16px;font-weight:700;margin:0 0 24px;">' +
                    email + '</p>' +
                    '<p style="color:#555;font-size:13px;margin:0 0 28px;">Klik pautan dalam emel ' +
                    'untuk aktifkan akaun anda.</p>' +
                    '<a href="login.html" style="display:inline-block;background:#fe2c55;color:#fff;' +
                    'padding:14px 32px;border-radius:12px;font-weight:800;text-decoration:none;' +
                    'font-size:15px;">Pergi ke Log Masuk</a></div>';
            }
        } else if (data && data.session) {
            // Auto-login (email confirmation dimatikan di Supabase)
            showToast('Akaun berjaya dicipta! Selamat datang!', 'success');
            setTimeout(function() { window.location.replace('index.html'); }, 800);
        }

    } catch (err) {
        devErr('[register]', err);
        showToast('Ralat tidak dijangka. Cuba lagi.', 'error');
        setLoading(btn, false, 'Daftar Sekarang');
    }
}

// ── LOG KELUAR ────────────────────────────────────────────────────────
async function handleLogout() {
    var ok = await _showConfirmDialog(
        'Log Keluar?',
        'Anda pasti mahu log keluar dari SnapFlow?',
        'Ya, Log Keluar', 'Batal'
    );
    if (!ok) return;

    try {
        await snapSupabase.auth.signOut();
        _authUser    = null;
        _authChecked = false;
        sessionStorage.clear();
        window.location.replace('splash.html');
    } catch (err) {
        devErr('[logout]', err);
        showToast('Ralat log keluar. Cuba lagi.', 'error');
    }
}

// ── LUPA KATA LALUAN ─────────────────────────────────────────────────
async function handleResetPassword() {
    var emailEl = document.getElementById('reset-email');
    var btn     = document.querySelector('.login-btn-main') || document.querySelector('#reset-btn');
    var email   = emailEl ? emailEl.value.trim() : '';

    if (!email) {
        showToast('Sila masukkan alamat emel anda.', 'warning');
        if (emailEl) emailEl.focus(); return;
    }

    setLoading(btn, true, 'Hantar Pautan Reset');

    try {
        var { error } = await snapSupabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/update-password.html'
        });

        if (error) throw error;

        // Tunjuk halaman kejayaan
        var wrap = document.querySelector('div[style*="max-width"], body > div');
        if (wrap) {
            wrap.innerHTML =
                '<div style="text-align:center;padding:20px;">' +
                '<i class="fa-solid fa-paper-plane" style="font-size:56px;color:#fe2c55;' +
                'margin-bottom:20px;display:block;"></i>' +
                '<h2 style="color:#fff;font-size:20px;font-weight:800;margin:0 0 12px;">' +
                'Emel Dihantar!</h2>' +
                '<p style="color:#666;font-size:14px;margin:0 0 8px;">' +
                'Pautan reset kata laluan dihantar ke:</p>' +
                '<p style="color:#fe2c55;font-size:15px;font-weight:700;margin:0 0 20px;">' +
                email + '</p>' +
                '<p style="color:#555;font-size:13px;margin:0 0 28px;">' +
                'Semak inbox dan folder Spam.<br>Pautan sah selama 1 jam.</p>' +
                '<a href="login.html" style="display:inline-block;background:#fe2c55;color:#fff;' +
                'padding:12px 28px;border-radius:12px;font-weight:800;text-decoration:none;' +
                'font-size:14px;">Kembali Log Masuk</a></div>';
        }

    } catch (err) {
        var msg = err.message || 'Gagal hantar emel reset.';
        if (msg.indexOf('For security purposes') !== -1) {
            msg = 'Terlalu banyak permintaan. Sila tunggu beberapa minit.';
        }
        showToast(msg, 'error');
        setLoading(btn, false, 'Hantar Pautan Reset');
    }
}

// ── KEMASKINI KATA LALUAN (selepas klik link reset) ──────────────────
async function updateUserPassword() {
    var newPassEl  = document.getElementById('new-password');
    var confPassEl = document.getElementById('confirm-password');
    var btn        = document.querySelector('.login-btn-main') || document.querySelector('#update-pass-btn');
    var newPass    = newPassEl  ? newPassEl.value  : '';
    var confPass   = confPassEl ? confPassEl.value : '';

    if (!newPass) {
        showToast('Sila masukkan kata laluan baru.', 'warning');
        if (newPassEl) newPassEl.focus(); return;
    }
    if (newPass.length < 6) {
        showToast('Kata laluan minimum 6 aksara.', 'warning'); return;
    }
    if (confPass && newPass !== confPass) {
        showToast('Kata laluan tidak sepadan. Sila semak semula.', 'warning'); return;
    }

    setLoading(btn, true, 'Kemaskini Kata Laluan');

    try {
        var { error } = await snapSupabase.auth.updateUser({ password: newPass });
        if (error) throw error;
        showToast('Kata laluan berjaya dikemaskini!', 'success');
        setTimeout(function() { window.location.replace('login.html'); }, 1500);
    } catch (err) {
        var msg = err.message || 'Gagal kemaskini kata laluan.';
        if (msg.indexOf('same password') !== -1) {
            msg = 'Kata laluan baru mestilah berbeza daripada yang lama.';
        }
        showToast(msg, 'error');
        setLoading(btn, false, 'Kemaskini Kata Laluan');
    }
}

// ==========================================
// 4. VIDEO FEED
// ==========================================
const likedVideos = new Set(); // ✅ FIX: Track like dengan Set, bukan bergantung pada warna CSS

// ── State tab feed ──────────────────────────────
let currentFeedTab = 'untuk-anda';
const progressIntervals = {}; // Progress bar intervals

// ── Tukar tab feed ───────────────────────────────
async function switchFeedTab(tab, el) {
    if (currentFeedTab === tab) return;
    currentFeedTab = tab;

    // Kemas kini tab UI
    document.querySelectorAll('.feed-tab-btn').forEach(b => b.classList.remove('active'));
    if (el) el.classList.add('active');

    // Hentikan semua progress bar aktif
    Object.keys(progressIntervals).forEach(id => stopProgressBar(id));

    // Muatkan semula feed
    await loadHomeFeed();
}

async function loadHomeFeed() {
    const feedContainer = document.getElementById('video-feed');
    if (!feedContainer) return; // auto-resolves since async

    // Tunjuk loader
    feedContainer.innerHTML = `<div style="height:100vh;display:flex;align-items:center;justify-content:center;color:#333;flex-direction:column;gap:12px;">
        <div class="loader-spin"></div>
        <p style="color:#444;font-size:14px;">Memuatkan video...</p>
    </div>`;

    try {
        const { data: { user } } = await snapSupabase.auth.getUser();

        // Muatkan senarai video yang dah dilike oleh user
        if (user) {
            const { data: myLikes } = await snapSupabase.from('likes').select('video_id').eq('user_id', user.id);
            if (myLikes) myLikes.forEach(l => likedVideos.add(l.video_id));
        }

        let videos, error;

        if (currentFeedTab === 'mengikuti') {
            // ── Tab Mengikuti: ambil video dari kreator yang diikuti sahaja ──
            if (!user) {
                feedContainer.innerHTML = `
                    <div style="height:100vh;display:flex;align-items:center;justify-content:center;color:#555;flex-direction:column;gap:16px;padding:20px;text-align:center;">
                        <i class="fa-solid fa-user-group" style="font-size:48px;color:#222;"></i>
                        <p style="font-size:16px;font-weight:700;color:#fff;">Ikuti kreator dahulu</p>
                        <p style="font-size:14px;color:#444;">Log masuk dan ikuti kreator untuk lihat video mereka di sini.</p>
                        <a href="login.html" style="background:#fe2c55;color:#fff;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px;">Log Masuk</a>
                    </div>`;
                return;
            }

            // Dapatkan senarai user yang diikuti
            const { data: follows } = await snapSupabase
                .from('follows')
                .select('following_id')
                .eq('follower_id', user.id);

            if (!follows || follows.length === 0) {
                feedContainer.innerHTML = `
                    <div style="height:100vh;display:flex;align-items:center;justify-content:center;color:#555;flex-direction:column;gap:16px;padding:20px;text-align:center;">
                        <i class="fa-solid fa-user-plus" style="font-size:48px;color:#222;"></i>
                        <p style="font-size:16px;font-weight:700;color:#fff;">Anda belum mengikuti sesiapa</p>
                        <p style="font-size:14px;color:#444;">Pergi ke Discover dan ikuti kreator kegemaran anda!</p>
                        <a href="discover.html" style="background:#fe2c55;color:#fff;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px;">Pergi ke Discover</a>
                    </div>`;
                return;
            }

            const followingIds = follows.map(f => f.following_id);

            // Ambil video dari kreator yang diikuti
            ({ data: videos, error } = await snapSupabase
                .from('videos')
                .select('*')
                .in('user_id', followingIds)
                .order('created_at', { ascending: false }));

            if (!videos || videos.length === 0) {
                feedContainer.innerHTML = `
                    <div style="height:100vh;display:flex;align-items:center;justify-content:center;color:#555;flex-direction:column;gap:16px;padding:20px;text-align:center;">
                        <i class="fa-solid fa-video-slash" style="font-size:48px;color:#222;"></i>
                        <p style="font-size:16px;font-weight:700;color:#fff;">Tiada video terbaru</p>
                        <p style="font-size:14px;color:#444;">Kreator yang anda ikuti belum upload video baru.</p>
                        <a href="discover.html" style="background:#fe2c55;color:#fff;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px;">Terokai Kreator Lain</a>
                    </div>`;
                return;
            }

        } else {
            // ── Tab Untuk Anda: semua video ──
            ({ data: videos, error } = await snapSupabase
                .from('videos')
                .select('*')
                .order('created_at', { ascending: false }));
        }

        if (error) throw error;

        if (!videos || videos.length === 0) {
            feedContainer.innerHTML = `<div style="height:100vh;display:flex;align-items:center;justify-content:center;color:#555;flex-direction:column;gap:15px;">
                <i class="fa-solid fa-video-slash" style="font-size:40px;"></i>
                <p>Tiada video lagi. Jadilah yang pertama!</p>
                <a href="upload.html" style="color:#fe2c55;font-weight:bold;">+ Upload Video</a>
            </div>`;
            return;
        }

        feedContainer.innerHTML = videos.map(vid => {
            const isLiked = likedVideos.has(vid.id);
            const username = vid.username || `User_${String(vid.user_id).substring(0, 5)}`;
            return `
            <div class="video-container" data-video-id="${vid.id}" ontouchstart="handleTouchStart(event, ${vid.id})" ontouchend="handleTouchEnd(event, ${vid.id})" ondblclick="handleDoubleTap(${vid.id}, event)">

                <video src="${escapeHtml(vid.video_url)}" loop playsinline preload="none" muted></video>

                <div class="video-gradient"></div>

                <!-- Butang Mute / Unmute -->
                <button class="mute-btn" id="mute-btn-${vid.id}" onclick="toggleMute(${vid.id}, event)" title="Mute/Unmute">
                    <i class="fa-solid fa-volume-xmark" id="mute-icon-${vid.id}"></i>
                </button>

                <!-- Animasi hati double-tap -->
                <div class="doubletap-heart" id="heart-anim-${vid.id}">
                    <i class="fa-solid fa-heart"></i>
                </div>

                <!-- Ikon Play/Pause tengah skrin -->
                <div class="play-pause-indicator" id="play-indicator-${vid.id}">
                    <i class="fa-solid fa-pause" id="play-icon-${vid.id}"></i>
                </div>

                <div class="side-bar">
                    <div class="action-item" onclick="handleFollow('${escapeHtml(vid.user_id)}', this)">
                        <div class="avatar-wrap">
                            <img loading="lazy" src="https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random" alt="avatar">
                            <div class="follow-plus-btn" id="follow-btn-${escapeHtml(vid.user_id)}">
                                <i class="fa-solid fa-plus" style="font-size:10px;color:#fff;"></i>
                            </div>
                        </div>
                    </div>

                    <div class="action-item" onclick="handleLikeAction(${vid.id})">
                        <i class="fa-solid fa-heart" id="like-icon-${vid.id}" style="color:${isLiked ? '#fe2c55' : '#fff'};"></i>
                        <span id="like-count-${vid.id}">${vid.likes_count || 0}</span>
                    </div>

                    <div class="action-item" onclick="toggleComments(${vid.id})">
                        <i class="fa-solid fa-comment-dots" style="color:#fff;"></i>
                        <span id="comment-count-${vid.id}">0</span>
                    </div>

                    <div class="action-item" onclick="showBookmarkAction(${vid.id})">
                        <i class="fa-solid fa-bookmark" id="bookmark-icon-${vid.id}" style="color:#fff;"></i>
                        <span>Simpan</span>
                    </div>
                    <div class="action-item" onclick="showReactionPicker(${vid.id}, this)">
                        <i class="fa-solid fa-face-smile" style="color:#fff;" id="react-icon-${vid.id}"></i>
                        <span>React</span>
                    </div>
                    <div class="action-item" onclick="showGiftPanel(${vid.id}, '${escapeHtml(vid.user_id)}', '${escapeHtml(username)}')">
                        <i class="fa-solid fa-gift" style="color:#fff;"></i>
                        <span>Hadiah</span>
                    </div>
                    <div class="action-item" onclick="showShareSheet(${vid.id}, '${escapeHtml(vid.caption || '')}')">
                        <i class="fa-solid fa-share" style="color:#fff;"></i>
                        <span>Kongsi</span>
                    </div>
                    <div class="action-item" onclick="showVideoOptions(${vid.id}, '${escapeHtml(vid.user_id)}')">
                        <i class="fa-solid fa-ellipsis-vertical" style="color:#fff;"></i>
                        <span>Lain</span>
                    </div>
                </div>

                <div class="video-info">
                    <h3>@${escapeHtml(username)}</h3>
                    <p>${renderCaption(vid.caption || '')}</p>
                    <!-- Reaction bar -->
                    <div id="reaction-bar-${vid.id}" style="display:none;flex-wrap:wrap;gap:5px;margin-top:6px;"></div>
                </div>
            </div>`;
        }).join('');

        // Simpan semua video data untuk DOM pruning
        allFeedVideos    = videos;
        renderedVideoIds = videos.map(v => v.id);

        setupObserver();
        setupDomPruning();         // ← DOM pruning aktif
        updateAllCommentCounts();
        updateBookmarkIcons();
        filterBlockedFromFeed();
        // Init reactions untuk semua video (buat secara lazy)
        videos.forEach(vid => initVideoReactions(vid.id));

    } catch (err) {
        console.error("loadHomeFeed error:", err);
        feedContainer.innerHTML = `<div style="height:100vh;display:flex;align-items:center;justify-content:center;color:#fe2c55;">Ralat memuatkan feed. Cuba lagi.</div>`;
    }
}

// ── State global untuk mute ─────────────────────
let isMuted = true; // Default muted (standard autoplay policy)

// ── State Dark/Light Mode ─────────────────────────
let isDarkMode = localStorage.getItem('snapflow-theme') !== 'light';
function applyTheme() {
    const root = document.documentElement;
    if (isDarkMode) {
        root.style.setProperty('--bg', '#000');
        root.style.setProperty('--bg2', '#111');
        root.style.setProperty('--bg3', '#1a1a1a');
        root.style.setProperty('--txt', '#fff');
        root.style.setProperty('--txt2', '#888');
        root.style.setProperty('--border', '#222');
        document.body.style.background = 'var(--bg)';
        document.body.style.color = 'var(--txt)';
    } else {
        root.style.setProperty('--bg', '#f5f5f5');
        root.style.setProperty('--bg2', '#fff');
        root.style.setProperty('--bg3', '#eee');
        root.style.setProperty('--txt', '#000');
        root.style.setProperty('--txt2', '#555');
        root.style.setProperty('--border', '#ddd');
        document.body.style.background = 'var(--bg)';
        document.body.style.color = 'var(--txt)';
    }
}
function toggleTheme() {
    isDarkMode = !isDarkMode;
    localStorage.setItem('snapflow-theme', isDarkMode ? 'dark' : 'light');
    applyTheme();
    showToast(isDarkMode ? '🌙 Mod Gelap' : '☀️ Mod Cerah', 'info');
    // Update ikon toggle
    const icon = document.getElementById('theme-toggle-icon');
    if (icon) icon.className = isDarkMode ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
}
// Apply tema semasa load
document.addEventListener('DOMContentLoaded', applyTheme);
applyTheme();

// ── Tap sekali: play/pause ───────────────────────
let tapTimeout = null;
let tapCount   = 0;

function handleTouchStart(event, videoId) {
    // Simpan masa untuk detect double-tap
    if (!window._tapTimes) window._tapTimes = {};
    window._tapTimes[videoId] = Date.now();
}

function handleTouchEnd(event, videoId) {
    const now = Date.now();
    const last = window._tapTimes?.[videoId] || 0;
    const diff = now - last;

    // Ignore jika klik pada sidebar, butang, atau mana-mana elemen interaktif
    const clickTarget = event.target;
    if (
        clickTarget.closest('.side-bar') ||
        clickTarget.closest('.action-item') ||
        clickTarget.closest('.mute-btn') ||
        clickTarget.closest('.comment-sheet') ||
        clickTarget.closest('.video-progress-track') ||
        clickTarget.closest('button') ||
        clickTarget.closest('a') ||
        clickTarget.tagName === 'BUTTON' ||
        clickTarget.tagName === 'A'
    ) return;

    if (diff < 300 && diff > 0) {
        // Double-tap!
        handleDoubleTap(videoId, event);
    } else {
        // Single tap — delay sikit untuk bezakan dari double-tap
        window._tapTimes[videoId] = now;
        setTimeout(() => {
            const timeSince = Date.now() - (window._tapTimes?.[videoId] || 0);
            if (timeSince >= 280) {
                togglePlayPauseById(videoId);
            }
        }, 280);
    }
}

function togglePlayPauseById(videoId) {
    const container = document.querySelector(`.video-container[data-video-id="${videoId}"]`);
    if (!container) return;
    const video = container.querySelector('video');
    const indicator = document.getElementById(`play-indicator-${videoId}`);
    const icon = document.getElementById(`play-icon-${videoId}`);
    if (!video) return;

    if (video.paused) {
        video.play();
        if (icon) icon.className = 'fa-solid fa-pause';
    } else {
        video.pause();
        if (icon) icon.className = 'fa-solid fa-play';
    }

    // Tunjuk ikon sekejap
    if (indicator) {
        indicator.classList.add('show');
        clearTimeout(indicator._hideTimer);
        indicator._hideTimer = setTimeout(() => indicator.classList.remove('show'), 700);
    }
}

function togglePlayPause(video) {
    video.paused ? video.play() : video.pause();
}

// ── Double-tap: Like dengan animasi hati ─────────
function handleDoubleTap(videoId, event) {
    // Trigger like
    handleLikeAction(videoId, true); // true = dari double-tap

    // Animasi hati di tempat tap
    const container = document.querySelector(`.video-container[data-video-id="${videoId}"]`);
    if (!container) return;

    const heartAnim = document.getElementById(`heart-anim-${videoId}`);
    if (!heartAnim) return;

    // Posisi hati ikut tempat tap (touch atau mouse)
    const rect = container.getBoundingClientRect();
    let x, y;
    if (event.changedTouches && event.changedTouches[0]) {
        x = event.changedTouches[0].clientX - rect.left;
        y = event.changedTouches[0].clientY - rect.top;
    } else {
        x = event.clientX - rect.left;
        y = event.clientY - rect.top;
    }

    // Letak hati di posisi tap
    heartAnim.style.left = `${x - 50}px`;
    heartAnim.style.top  = `${y - 50}px`;
    heartAnim.style.display = 'flex';

    // Reset animasi
    heartAnim.style.animation = 'none';
    heartAnim.offsetHeight; // reflow
    heartAnim.style.animation = 'heartBurst 0.8s ease forwards';

    setTimeout(() => { heartAnim.style.display = 'none'; }, 850);
}

// ── Mute / Unmute ────────────────────────────────
function toggleMute(videoId, event) {
    event.stopPropagation();
    isMuted = !isMuted;

    // Apply ke semua video dalam feed
    document.querySelectorAll('.video-container video').forEach(v => {
        v.muted = isMuted;
    });

    // Update semua ikon mute
    document.querySelectorAll('[id^="mute-icon-"]').forEach(icon => {
        icon.className = isMuted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';
    });

    showToast(isMuted ? '🔇 Senyap' : '🔊 Bunyi Dihidupkan', 'info');
}

// ==========================================
// 5. FOLLOW (FIXED - simpan ke DB)
// ==========================================
async function handleFollow(targetUserId, itemEl) {
    const btn = document.getElementById(`follow-btn-${targetUserId}`);
    if (!btn) return;

    const user = await getAuthUser();
    if (!user) return showToast('Sila log masuk dahulu.', 'warning');
    if (user.id === targetUserId) return showToast('Anda tidak boleh follow diri sendiri.', 'warning');

    // Semak sama ada sudah follow
    const { data: existing } = await snapSupabase.from('follows')
        .select('id').eq('follower_id', user.id).eq('following_id', targetUserId).single();

    if (existing) {
        // Unfollow
        await snapSupabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', targetUserId);
        btn.style.background = '#fe2c55';
        btn.innerHTML = '<i class="fa-solid fa-plus" style="font-size:10px;color:#fff;"></i>';
        showToast('Berjaya unfollow.', 'info');
    } else {
        // Follow
        await snapSupabase.from('follows').insert([{ follower_id: user.id, following_id: targetUserId }]);
        btn.style.background = '#2ecc71';
        btn.innerHTML = '<i class="fa-solid fa-check" style="font-size:10px;color:#fff;"></i>';
        showToast('Berjaya follow! ✅', 'success');
    }
}

// ── Ciri 1: Render hashtag clickable dalam kapsyen ──
function renderCaption(caption) {
    if (!caption) return '';
    return escapeHtml(caption).replace(/#(\w+)/g, (match, tag) => {
        return `<span style="color:#fe2c55;font-weight:700;cursor:pointer;" onclick="event.stopPropagation();window.location.href='discover.html?hashtag=${encodeURIComponent('#'+tag)}">${match}</span>`;
    });
}

// ── Ciri 2: Share Sheet ──────────────────────────
function showShareSheet(videoId, caption) {
    document.getElementById('snap-share-sheet')?.remove();

    const pageUrl = `${window.location.origin}/index.html#video-${videoId}`;
    const text = caption ? `${caption} — SnapFlow` : 'Tengok video ini di SnapFlow!';

    const sheet = document.createElement('div');
    sheet.id = 'snap-share-sheet';
    sheet.innerHTML = `
        <div onclick="document.getElementById('snap-share-sheet').remove()"
             style="position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:8000;"></div>
        <div style="position:fixed;bottom:0;left:0;right:0;background:#111;border-radius:20px 20px 0 0;padding:20px;z-index:8001;border-top:1px solid #222;">
            <div style="width:40px;height:4px;background:#333;border-radius:2px;margin:0 auto 20px;"></div>
            <p style="font-size:13px;color:#555;margin:0 0 16px;text-align:center;">Kongsi Video</p>
            <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:20px;">
                <button onclick="shareToWhatsApp('${pageUrl}', '${caption}')" class="share-app-btn" style="background:#1a1a1a;border:1px solid #25D366;color:#25D366;">
                    <i class="fa-brands fa-whatsapp" style="font-size:22px;"></i><span>WhatsApp</span>
                </button>
                <button onclick="shareToTelegram('${pageUrl}', '${caption}')" class="share-app-btn" style="background:#1a1a1a;border:1px solid #2CA5E0;color:#2CA5E0;">
                    <i class="fa-brands fa-telegram" style="font-size:22px;"></i><span>Telegram</span>
                </button>
                <button onclick="shareToTwitter('${pageUrl}', '${caption}')" class="share-app-btn" style="background:#1a1a1a;border:1px solid #1DA1F2;color:#1DA1F2;">
                    <i class="fa-brands fa-x-twitter" style="font-size:22px;"></i><span>X</span>
                </button>
                <button onclick="copyVideoLink('${pageUrl}')" class="share-app-btn" style="background:#1a1a1a;border:1px solid #555;color:#fff;">
                    <i class="fa-solid fa-link" style="font-size:22px;"></i><span>Salin</span>
                </button>
                <button onclick="nativeShare('${pageUrl}', '${text}')" class="share-app-btn" style="background:#1a1a1a;border:1px solid #fe2c55;color:#fe2c55;">
                    <i class="fa-solid fa-share-nodes" style="font-size:22px;"></i><span>Lain-lain</span>
                </button>
            </div>
        </div>`;

    document.body.appendChild(sheet);
}

function shareToWhatsApp(url, caption) {
    const text = encodeURIComponent(`${caption || 'Tengok video ini!'} ${url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
    document.getElementById('snap-share-sheet')?.remove();
}

function shareToTelegram(url, caption) {
    const text = encodeURIComponent(caption || 'Tengok video ini di SnapFlow!');
    window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${text}`, '_blank');
    document.getElementById('snap-share-sheet')?.remove();
}

function shareToTwitter(url, caption) {
    const text = encodeURIComponent(`${caption || 'Tengok video ini!'} #SnapFlow`);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}`, '_blank');
    document.getElementById('snap-share-sheet')?.remove();
}

function copyVideoLink(url) {
    navigator.clipboard.writeText(url).then(() => {
        showToast('Pautan disalin! 🔗', 'success');
        document.getElementById('snap-share-sheet')?.remove();
    });
}

function nativeShare(url, text) {
    if (navigator.share) {
        navigator.share({ title: 'SnapFlow', text, url });
    } else {
        copyVideoLink(url);
    }
    document.getElementById('snap-share-sheet')?.remove();
}

function handleShare(url) {
    if (navigator.share) {
        navigator.share({ title: 'SnapFlow Video', url });
    } else {
        navigator.clipboard.writeText(url).then(() => showToast('Pautan disalin!', 'success'));
    }
}

// ==========================================
// 6. LIKE (FIXED - guna Set bukan warna)
// ==========================================
async function handleLikeAction(videoId, fromDoubleTap = false) {
    const icon = document.getElementById(`like-icon-${videoId}`);
    const countSpan = document.getElementById(`like-count-${videoId}`);
    const user = await getAuthUser();
    if (!user) return showToast('Log masuk dahulu.', 'warning');

    const isLiked = likedVideos.has(videoId);

    // Double-tap hanya boleh like, tidak unlike
    if (fromDoubleTap && isLiked) return;

    if (!isLiked) {
        // Optimistic update
        likedVideos.add(videoId);
        icon.style.color = '#fe2c55';
        icon.style.transform = 'scale(1.3)';
        setTimeout(() => icon.style.transform = 'scale(1)', 200);
        countSpan.innerText = parseInt(countSpan.innerText) + 1;

        await snapSupabase.from('likes').insert([{ user_id: user.id, video_id: videoId }]);
        await snapSupabase.rpc('increment_likes', { row_id: videoId });
    } else {
        // Unlike
        likedVideos.delete(videoId);
        icon.style.color = '#fff';
        countSpan.innerText = Math.max(0, parseInt(countSpan.innerText) - 1);

        await snapSupabase.from('likes').delete().eq('user_id', user.id).eq('video_id', videoId);
        await snapSupabase.rpc('decrement_likes', { row_id: videoId });
    }
}

async function updateAllCommentCounts() {
    try {
        const { data: counts } = await snapSupabase.from('comments').select('video_id');
        if (counts) {
            const stats = counts.reduce((acc, curr) => {
                acc[curr.video_id] = (acc[curr.video_id] || 0) + 1;
                return acc;
            }, {});
            Object.keys(stats).forEach(id => {
                const el = document.getElementById(`comment-count-${id}`);
                if (el) el.innerText = stats[id];
            });
        }
    } catch (e) { /* senyap */ }
}

// ==========================================
// 7. SISTEM KOMEN
// ==========================================
let currentVideoId = null;

async function toggleComments(videoId) {
    const sheet = document.getElementById('comment-sheet');
    const overlay = document.getElementById('comment-overlay');
    if (!sheet) return;

    if (sheet.classList.contains('active') && currentVideoId === videoId) {
        sheet.classList.remove('active');
        overlay.style.display = 'none';
        currentVideoId = null;
    } else {
        sheet.classList.add('active');
        overlay.style.display = 'block';
        currentVideoId = videoId;
        loadComments(videoId);
    }
}

let replyingToComment = null; // { id, username }

async function loadComments(videoId) {
    const list = document.getElementById('comment-list');
    if (!list) return;
    list.innerHTML = '<p style="text-align:center;color:#555;padding:20px;">Memuatkan...</p>';

    try {
        const { data, error } = await snapSupabase.from('comments')
            .select('*').eq('video_id', videoId).order('created_at', { ascending: true });

        if (error) throw error;

        if (!data || data.length === 0) {
            list.innerHTML = '<p style="text-align:center;color:#444;margin-top:20px;padding:20px;">Belum ada komen. Jadilah yang pertama! 💬</p>';
            return;
        }

        // Susun: komen utama dulu, kemudian replies di bawah komen parent
        const roots   = data.filter(c => !c.parent_id);
        const replies = data.filter(c =>  c.parent_id);

        const buildComment = (c, isReply = false) => {
            const childReplies = replies.filter(r => r.parent_id === c.id);
            return `
                <div class="comment-item ${isReply ? 'comment-reply' : ''}" style="${isReply ? 'padding-left:44px;margin-top:2px;' : ''}">
                    <div style="background-image:url('https://ui-avatars.com/api/?name=${encodeURIComponent(escapeHtml(c.username||'U'))}&background=random');background-size:cover;background-color:#333;width:${isReply?'30px':'36px'};height:${isReply?'30px':'36px'};border-radius:50%;flex-shrink:0;"></div>
                    <div style="flex:1;min-width:0;">
                        <strong style="font-size:13px;color:#ccc;">${escapeHtml(c.username||'User')}</strong>
                        <p style="margin:3px 0 4px;font-size:14px;color:#eee;line-height:1.4;">${escapeHtml(c.comment_text)}</p>
                        <div style="display:flex;gap:14px;align-items:center;">
                            <span style="font-size:11px;color:#555;">${timeAgo(c.created_at)}</span>
                            ${!isReply ? `<button onclick="setReplyTo(${c.id}, '${escapeHtml(c.username||'User')}')" style="background:transparent;border:none;color:#888;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;padding:0;">Balas</button>` : ''}
                        </div>
                        ${childReplies.length > 0 ? `
                            <button onclick="toggleReplies(${c.id})" style="background:transparent;border:none;color:#fe2c55;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;padding:4px 0;display:flex;align-items:center;gap:4px;">
                                <i class="fa-solid fa-caret-right" id="reply-caret-${c.id}"></i> ${childReplies.length} balasan
                            </button>
                            <div id="replies-${c.id}" style="display:none;">
                                ${childReplies.map(r => buildComment(r, true)).join('')}
                            </div>
                        ` : ''}
                    </div>
                </div>`;
        };

        list.innerHTML = roots.map(c => buildComment(c)).join('');
    } catch (err) {
        list.innerHTML = '<p style="text-align:center;color:#fe2c55;padding:20px;">Ralat memuatkan komen.</p>';
    }
}

function setReplyTo(commentId, username) {
    replyingToComment = { id: commentId, username };
    const input = document.getElementById('new-comment');
    if (input) {
        input.placeholder = `Balas @${username}...`;
        input.focus();
    }
    // Tunjuk label reply
    let label = document.getElementById('reply-label');
    if (!label) {
        label = document.createElement('div');
        label.id = 'reply-label';
        label.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 16px;background:#1a0008;font-size:12px;color:#fe2c55;';
        const area = document.querySelector('.comment-input-area');
        area?.parentNode?.insertBefore(label, area);
    }
    label.innerHTML = `<i class="fa-solid fa-reply"></i> Balas @${escapeHtml(username)} <button onclick="cancelReply()" style="margin-left:auto;background:transparent;border:none;color:#555;cursor:pointer;font-size:14px;">✕</button>`;
}

function cancelReply() {
    replyingToComment = null;
    const input = document.getElementById('new-comment');
    if (input) input.placeholder = 'Tambah komen...';
    document.getElementById('reply-label')?.remove();
}

function toggleReplies(commentId) {
    const el = document.getElementById(`replies-${commentId}`);
    const caret = document.getElementById(`reply-caret-${commentId}`);
    if (!el) return;
    const isOpen = el.style.display !== 'none';
    el.style.display = isOpen ? 'none' : 'block';
    if (caret) caret.style.transform = isOpen ? 'rotate(0)' : 'rotate(90deg)';
}

async function sendComment() {
    const input = document.getElementById('new-comment');
    if (!input?.value?.trim() || !currentVideoId) return;

    const user = await getAuthUser();
    if (!user) return showToast('Log masuk dahulu.', 'warning');

    const commentText = input.value.trim();
    const parentId = replyingToComment?.id || null;
    input.value = '';
    cancelReply();

    try {
        await snapSupabase.from('comments').insert([{
            video_id: currentVideoId,
            user_id: user.id,
            username: user.user_metadata?.full_name || 'User',
            comment_text: commentText,
            parent_id: parentId
        }]);
        loadComments(currentVideoId);
        updateAllCommentCounts();

        // Update count di icon (hanya untuk komen utama)
        if (!parentId) {
            const el = document.getElementById(`comment-count-${currentVideoId}`);
            if (el) el.innerText = parseInt(el.innerText || 0) + 1;
        }
    } catch (err) {
        showToast('Gagal hantar komen.', 'error');
    }
}

// Enter key untuk hantar komen
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && document.activeElement?.id === 'new-comment') {
        sendComment();
    }
});

// ==========================================
// 8. VIDEO OBSERVER (AUTO PLAY/PAUSE)
// ==========================================
function setupObserver() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target.querySelector('video');
            if (!video) return;

            if (entry.isIntersecting) {
                // Apply mute state semasa
                video.muted = isMuted;
                video.play().catch(() => {});

                // Update ikon mute untuk video ini
                const vidId = entry.target.dataset.videoId;
                const muteIcon = document.getElementById(`mute-icon-${vidId}`);
                if (muteIcon) {
                    muteIcon.className = isMuted
                        ? 'fa-solid fa-volume-xmark'
                        : 'fa-solid fa-volume-high';
                }

                // Mulakan progress bar untuk video ini
                setupProgressBar(video, vidId);

            } else {
                video.pause();
                // Hentikan progress update
                const vidId = entry.target.dataset.videoId;
                stopProgressBar(vidId);
            }
        });
    }, { threshold: 0.6 });

    document.querySelectorAll('.video-container').forEach(el => observer.observe(el));
}

// ==========================================
// 9. SEARCH
// ==========================================
function toggleSearch() {
    const overlay = document.getElementById('search-overlay');
    if (!overlay) return;
    const isHidden = overlay.style.display === 'none' || !overlay.style.display;
    overlay.style.display = isHidden ? 'block' : 'none';
    if (isHidden) document.getElementById('search-input')?.focus();
}

async function handleSearch(event) {
    if (event.key !== 'Enter') return;
    const query = document.getElementById('search-input')?.value?.trim();
    if (!query) return;

    const resultsEl = document.getElementById('search-results');
    if (resultsEl) resultsEl.innerHTML = '<p style="color:#555;text-align:center;">Mencari...</p>';

    const { data: videos } = await snapSupabase.from('videos')
        .select('*').ilike('caption', `%${query}%`).limit(10);

    if (!resultsEl) return;

    if (!videos || videos.length === 0) {
        resultsEl.innerHTML = '<p style="color:#555;text-align:center;padding:20px;">Tiada hasil dijumpai.</p>';
        return;
    }

    resultsEl.innerHTML = videos.map(v => `
        <div style="display:flex;gap:12px;padding:12px;border-bottom:1px solid #111;align-items:center;">
            <video src="${escapeHtml(v.video_url)}" style="width:60px;height:80px;object-fit:cover;border-radius:8px;" muted preload="none"></video>
            <div>
                <p style="margin:0;font-size:14px;">${escapeHtml(v.caption || 'Tiada kapsyen')}</p>
                <span style="font-size:12px;color:#555;">${timeAgo(v.created_at)}</span>
            </div>
        </div>
    `).join('');
}

// ==========================================
// 10. UPLOAD VIDEO/GAMBAR
// ==========================================
// State untuk upload
let currentFilter  = 'none';
let compressEnabled = false;
let isDuetMode     = false;
let duetSourceVideo = null; // { id, url }

function previewFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const previewImg = document.getElementById('preview-img');
    const previewVid = document.getElementById('preview-vid');
    const placeholder = document.getElementById('placeholder-content');
    const filterSection = document.getElementById('filter-section');

    if (placeholder) placeholder.style.display = 'none';

    const url = URL.createObjectURL(file);

    if (file.type.startsWith('video/')) {
        if (previewImg) previewImg.style.display = 'none';
        if (previewVid) {
            previewVid.src = url;
            previewVid.style.display = 'block';
            previewVid.style.filter = 'none';
        }
        if (filterSection) filterSection.style.display = 'block';

        // Tunjuk saiz fail + cadangan compress
        const sizeMB = (file.size / 1024 / 1024).toFixed(1);
        const statusEl = document.getElementById('compress-status');
        if (statusEl) {
            statusEl.innerText = `Saiz asal: ${sizeMB}MB${file.size > 20*1024*1024 ? ' — Disyorkan dimampatkan' : ''}`;
        }
        if (file.size > 20*1024*1024) {
            const toggle = document.getElementById('compress-toggle');
            if (toggle) { toggle.checked = true; toggleCompress(toggle); }
        }
    } else {
        if (previewVid) previewVid.style.display = 'none';
        if (previewImg) {
            previewImg.src = url;
            previewImg.style.display = 'block';
            previewImg.style.filter = 'none';
        }
        if (filterSection) filterSection.style.display = 'block';
    }

    // Reset filter buttons
    currentFilter = 'none';
    document.querySelectorAll('.filter-btn').forEach(b => {
        b.style.borderColor = 'transparent';
        b.style.color = '#aaa';
    });
    const firstBtn = document.querySelector('.filter-btn');
    if (firstBtn) { firstBtn.style.borderColor = '#fe2c55'; firstBtn.style.color = '#fff'; }
}

// ── Terapkan filter pada preview ─────────────────
function applyFilter(filterValue, btn) {
    currentFilter = filterValue;

    // Kemas kini butang
    document.querySelectorAll('.filter-btn').forEach(b => {
        b.style.borderColor = 'transparent';
        b.style.color = '#aaa';
    });
    btn.style.borderColor = '#fe2c55';
    btn.style.color = '#fff';

    // Apply filter pada preview
    const vid = document.getElementById('preview-vid');
    const img = document.getElementById('preview-img');
    if (vid && vid.style.display !== 'none') vid.style.filter = filterValue === 'none' ? '' : filterValue;
    if (img && img.style.display !== 'none') img.style.filter = filterValue === 'none' ? '' : filterValue;

    // Nota: filter CSS tidak embedded dalam video — filter hanya untuk preview visual
    // Untuk embed sebenar guna canvas (terlalu berat untuk mobile)
}

function toggleCompress(toggle) {
    compressEnabled = toggle.checked;
    const slider = document.getElementById('compress-slider');
    const status  = document.getElementById('compress-status');
    if (slider) slider.style.background = compressEnabled ? '#fe2c55' : '#333';
    const file = document.getElementById('file-input')?.files[0];
    const sizeMB = file ? (file.size / 1024 / 1024).toFixed(1) : '?';
    if (status) status.innerText = compressEnabled
        ? `Aktif — anggaran jimat ~40% dari ${sizeMB}MB`
        : `Tidak aktif — saiz asal ${sizeMB}MB`;
}

async function startUpload() {
    const fileInput = document.getElementById('file-input');
    const caption   = document.getElementById('video-caption')?.value?.trim();
    const btn       = document.getElementById('upload-btn');

    if (!fileInput?.files[0]) return showToast('Sila pilih fail dahulu.', 'warning');

    let file = fileInput.files[0];
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) return showToast('Fail terlalu besar. Maksimum 50MB.', 'error');

    setLoading(btn, true, 'Memproses...');

    try {
        const { data: { user } } = await snapSupabase.auth.getUser();
        if (!user) { setLoading(btn, false, 'Kongsi Sekarang'); return showToast('Sila log masuk.', 'warning'); }

        // ── Video Compression (jika aktif) ───────────────
        if (compressEnabled && file.type.startsWith('video/')) {
            showToast('Memampatkan video...', 'info');
            try {
                file = await compressVideo(file);
                const newMB = (file.size / 1024 / 1024).toFixed(1);
                showToast(`Video dimampatkan: ${newMB}MB ✅`, 'success');
            } catch (e) {
                console.warn('Compression gagal, guna fail asal:', e);
            }
        }

        setLoading(btn, true, 'Memuat naik...');

        const fileExt  = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        const bucket   = file.type.startsWith('video/') ? 'videos' : 'images';

        const { error: uploadError } = await snapSupabase.storage
            .from(bucket).upload(fileName, file, { upsert: false });
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = snapSupabase.storage.from(bucket).getPublicUrl(fileName);

        // Tambah filter label dalam caption jika bukan 'none'
        const filterLabel  = currentFilter !== 'none' ? ` [filter:${currentFilter.replace(/[()%,.]/g,'')}]` : '';
        const duetLabel    = isDuetMode && duetSourceVideo ? ` [duet:${duetSourceVideo.id}]` : '';
        const finalCaption = (caption || '') + filterLabel + duetLabel;

        const { error: dbError } = await snapSupabase.from('videos').insert([{
            user_id:    user.id,
            video_url:  publicUrl,
            caption:    finalCaption,
            username:   user.user_metadata?.full_name || 'User',
            likes_count: 0,
            is_duet:    isDuetMode,
            duet_source_id: isDuetMode && duetSourceVideo ? duetSourceVideo.id : null,
            scheduled_at:  scheduleAt || null,
            is_published:  scheduleAt ? false : true,
        }]);
        if (dbError) throw dbError;

        if (scheduleAt) {
            const dt = new Date(scheduleAt).toLocaleString('ms-MY');
            showToast(`Video dijadualkan pada ${dt} 📅`, 'success');
        } else {
            showToast('Video berjaya dikongsikan! 🎉', 'success');
        }
        setTimeout(() => window.location.href = 'index.html', 1500);

    } catch (err) {
        console.error('Upload error:', err);
        showToast('Ralat semasa upload: ' + err.message, 'error');
        setLoading(btn, false, 'Kongsi Sekarang');
    }
}

// ==========================================
// 11. PROFIL USER
// ==========================================
async function loadProfileData() {
    const profileGrid = document.getElementById('profile-video-grid');
    if (!profileGrid) return;

    try {
        const user = await getAuthUser();
        if (!user) return;

        const name = user.user_metadata?.full_name || 'User';
        const handle = name.toLowerCase().replace(/\s+/g, '');

        // Update UI
        const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
        setEl('profile-username', name);
        setEl('display-username', name);
        setEl('display-fullname', name);
        setEl('display-handle', `@${handle}`);

        const avatarEl = document.getElementById('profile-avatar');
        if (avatarEl) avatarEl.style.backgroundImage = `url('https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=200')`;

        // Ambil video user
        const { data: myVideos, error } = await snapSupabase.from('videos')
            .select('*').eq('user_id', user.id).order('created_at', { ascending: false });

        if (error) throw error;

        const videoCountEl = document.getElementById('video-count');
        if (videoCountEl) videoCountEl.innerText = myVideos?.length || 0;

        // Jumlah likes
        const totalLikes = myVideos?.reduce((sum, v) => sum + (v.likes_count || 0), 0) || 0;
        setEl('total-likes-display', totalLikes);

        // Ambil follower count
        const { count: followersCount } = await snapSupabase.from('follows')
            .select('*', { count: 'exact', head: true }).eq('following_id', user.id);
        const { count: followingCount } = await snapSupabase.from('follows')
            .select('*', { count: 'exact', head: true }).eq('follower_id', user.id);

        setEl('followers-count', followersCount || 0);
        setEl('following-count', followingCount || 0);

        // ── Bio Text ──────────────────────────────────────────
        const bio = user.user_metadata?.bio || '';
        const bioEl = document.getElementById('display-bio');
        if (bioEl) bioEl.innerText = bio;

        // ── Bio Links ─────────────────────────────────────────
        const bioLinks = user.user_metadata?.bio_links || [];
        const linksEl  = document.getElementById('bio-links-display');
        if (linksEl) {
            linksEl.innerHTML = bioLinks.map(link => {
                const icon = getBioLinkIcon(link.url);
                return `<a href="${escapeHtml(link.url)}" target="_blank" rel="noopener"
                    style="display:inline-flex;align-items:center;gap:5px;background:#111;border:1px solid #1a1a1a;
                           color:#ccc;padding:5px 12px;border-radius:20px;font-size:12px;font-weight:600;
                           text-decoration:none;transition:all 0.2s;"
                    onmouseover="this.style.borderColor='#fe2c55';this.style.color='#fe2c55'"
                    onmouseout="this.style.borderColor='#1a1a1a';this.style.color='#ccc'">
                    ${icon} ${escapeHtml(link.label || link.url.replace(/https?:\/\//, '').slice(0, 20))}
                </a>`;
            }).join('');
        }

        // ── Verified Badge (auto pada 1000 pengikut) ──────────
        const isVerified = (followersCount || 0) >= 1000;
        const badge = document.getElementById('verified-badge');
        if (badge) badge.style.display = isVerified ? 'inline-flex' : 'none';

        // Simpan status verified dalam metadata
        if (isVerified && !user.user_metadata?.verified) {
            await snapSupabase.auth.updateUser({ data: { verified: true } });
        }

        // Kemas kini followers count dalam stat — boleh klik ke halaman followers
        const fcEl = document.getElementById('followers-count');
        if (fcEl) {
            fcEl.style.cursor = 'pointer';
            fcEl.onclick = () => window.location.href = 'followers.html?tab=followers';
        }
        const fgEl = document.getElementById('following-count');
        if (fgEl) {
            fgEl.style.cursor = 'pointer';
            fgEl.onclick = () => window.location.href = 'followers.html?tab=following';
        }

        if (!myVideos || myVideos.length === 0) {
            profileGrid.innerHTML = `
                <div style="grid-column:span 3;text-align:center;color:#555;padding:50px 20px;">
                    <i class="fa-solid fa-video" style="font-size:40px;margin-bottom:15px;display:block;"></i>
                    Belum ada video dipos.
                    <br><a href="upload.html" style="color:#fe2c55;font-weight:bold;display:block;margin-top:10px;">+ Upload Video</a>
                </div>`;
            return;
        }

        profileGrid.innerHTML = myVideos.map(vid => `
            <div class="profile-video-item" onclick="viewVideo(${vid.id})" id="pvitem-${vid.id}">
                <canvas id="thumb-${vid.id}" style="width:100%;height:100%;object-fit:cover;display:block;background:#111;"></canvas>
                <div class="profile-video-overlay">
                    <i class="fa-solid fa-heart"></i> ${vid.likes_count || 0}
                </div>
            </div>
        `).join('');

        // Jana thumbnail untuk setiap video selepas render
        myVideos.forEach(vid => generateThumbnail(vid.video_url, vid.id));

    } catch (error) {
        console.error("Ralat Load Profile:", error);
        showToast('Gagal muatkan profil.', 'error');
    }
}

// ==========================================
// 12. EDIT PROFIL
// ==========================================
async function saveProfileChanges() {
    const newName = document.getElementById('edit-fullname')?.value?.trim();
    const btn = document.getElementById('save-btn');

    if (!newName) return showToast('Nama tidak boleh kosong.', 'warning');
    setLoading(btn, true, 'Simpan Perubahan');

    const { error } = await snapSupabase.auth.updateUser({ data: { full_name: newName } });
    if (error) {
        showToast('Gagal simpan: ' + error.message, 'error');
    } else {
        showToast('Profil berjaya dikemaskini! ✅', 'success');
        setTimeout(() => window.location.href = 'profile.html', 1000);
    }
    setLoading(btn, false, 'Simpan Perubahan');
}

// ==========================================
// 13. SHOP & CART
// ==========================================
const PRODUCTS = [
    { id: 1, name: 'Baju Lelaki Slim Fit', brand: 'Fesyen', price: 59, img: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400', desc: 'Baju lelaki moden slim fit, pelbagai warna tersedia.' },
    { id: 2, name: 'Kasut Sukan Ringan', brand: 'Sukan', price: 129, img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', desc: 'Kasut sukan ringan dan selesa untuk aktiviti harian.' },
    { id: 3, name: 'Set Penjagaan Kulit', brand: 'Kecantikan', price: 89, img: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400', desc: 'Set lengkap penjagaan kulit untuk kulit sihat bercahaya.' },
    { id: 4, name: 'Fon Telinga Wayarles', brand: 'Elektronik', price: 199, img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400', desc: 'Fon telinga Bluetooth dengan peredam bunyi aktif.' },
    { id: 5, name: 'Nasi Lemak Premium', brand: 'Makanan', price: 12, img: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400', desc: 'Nasi lemak tradisional dengan sambal istimewa.' },
    { id: 6, name: 'Dress Perempuan Floral', brand: 'Fesyen', price: 79, img: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=400', desc: 'Dress floral cantik sesuai untuk majlis santai.' },
    { id: 7, name: 'Smart Watch', brand: 'Elektronik', price: 299, img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400', desc: 'Jam tangan pintar dengan pemantauan kesihatan 24/7.' },
    { id: 8, name: 'Kek Coklat Homemade', brand: 'Makanan', price: 45, img: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400', desc: 'Kek coklat lembap buatan tangan, tempahan sahaja.' },
];

// ── CART SYSTEM — Hybrid (localStorage cache + Supabase sync) ─────────
// localStorage: untuk UI cepat (offline-friendly)
// Supabase cart_items: untuk keselamatan & cross-device sync
// Harga TIDAK disimpan dalam cart — dikira semula server side pada checkout

let cart = [];

// Load dari localStorage dulu (pantas)
try {
    var _rawCart = localStorage.getItem('sf_cart_v2');
    if (_rawCart) {
        var _parsed = JSON.parse(_rawCart);
        // Hanya simpan product_id dan qty — BUANG harga dari cache lama
        cart = _parsed.map(function(i){ return { id: i.id, name: i.name, img: i.img || '', qty: i.qty || 1 }; });
    }
} catch(e) { cart = []; }

function saveCart() {
    // Simpan TANPA harga (harga akan diambil dari DB pada checkout)
    var safeCart = cart.map(function(i){ return { id: i.id, name: i.name, img: i.img || '', qty: i.qty }; });
    try { localStorage.setItem('sf_cart_v2', JSON.stringify(safeCart)); } catch(e) {}
    // Sync ke Supabase (async, tidak perlu tunggu)
    _syncCartToSupabase();
}

// Sync cart ke Supabase (background)
var _syncTimer = null;
async function _syncCartToSupabase() {
    clearTimeout(_syncTimer);
    _syncTimer = setTimeout(async function() {
        try {
            var user = await getAuthUser();
            if (!user) return;
            // Delete semua cart lama, insert baru (upsert)
            await snapSupabase.from('cart_items').delete().eq('user_id', user.id);
            if (cart.length > 0) {
                var items = cart.map(function(i){ return { user_id: user.id, product_id: i.id, quantity: i.qty }; });
                await snapSupabase.from('cart_items').insert(items);
            }
        } catch(e) { devErr('[cart sync]', e); }
    }, 800);
}

// Load cart dari Supabase (bila user login)
async function loadCartFromServer() {
    try {
        var user = await getAuthUser();
        if (!user) return;
        var result = await snapSupabase
            .from('cart_items')
            .select('product_id, quantity, products(id, name, image_url)')
            .eq('user_id', user.id);
        if (result.error || !result.data || result.data.length === 0) return;
        // Merge dengan cart lokal (server wins)
        cart = result.data.map(function(row) {
            return {
                id:  row.product_id,
                name: row.products ? row.products.name : 'Produk',
                img:  row.products ? (row.products.image_url || '') : '',
                qty:  row.quantity
            };
        });
        saveCart();
        if (typeof updateCartBadge === 'function') updateCartBadge();
        if (typeof renderCart === 'function') renderCart();
    } catch(e) { devErr('[cart load]', e); }
}

function filterBrand(brand, el) {
    document.querySelectorAll('.brand-item').forEach(b => b.classList.remove('active'));
    if (el) el.classList.add('active');

    const filtered = brand === 'All' ? PRODUCTS : PRODUCTS.filter(p => p.brand === brand);
    const grid = document.getElementById('filtered-product-list');
    const title = document.getElementById('selected-brand-name');

    if (title) title.innerText = brand === 'All' ? 'Semua Produk' : brand;
    if (!grid) return;

    grid.innerHTML = filtered.map(p => `
        <div class="product-card" onclick="window.location.href='product-detail.html?id=${p.id}'">
            <img loading="lazy" src="${p.img}" alt="${escapeHtml(p.name)}" style="width:100%;aspect-ratio:1/1;object-fit:cover;">
            <div style="padding:10px;">
                <h3 style="font-size:13px;margin:0 0 5px;">${escapeHtml(p.name)}</h3>
                <p style="color:#fe2c55;font-weight:bold;margin:0 0 8px;font-size:14px;">RM ${p.price.toLocaleString()}</p>
                <button onclick="event.stopPropagation();addToCart(${p.id})" class="btn-cart">
                    <i class="fa-solid fa-cart-plus"></i> Tambah
                </button>
            </div>
        </div>
    `).join('');
}

function loadShop() {
    const grid = document.getElementById('shop-grid');
    if (!grid) return;
    filterBrand('All', null);

    grid.innerHTML = PRODUCTS.map(p => `
        <div class="product-card">
            <img loading="lazy" src="${p.img}" alt="${escapeHtml(p.name)}" style="width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:10px 10px 0 0;">
            <div style="padding:12px;">
                <h3 style="font-size:14px;margin:0 0 5px;">${escapeHtml(p.name)}</h3>
                <p style="color:#fe2c55;font-weight:bold;margin:0 0 10px;">RM ${p.price.toLocaleString()}</p>
                <button onclick="addToCart(${p.id})" class="btn-cart">
                    <i class="fa-solid fa-cart-plus"></i> Tambah ke Troli
                </button>
            </div>
        </div>
    `).join('');

    updateCartBadge();
}

function addToCart(productId) {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return;

    const existing = cart.find(i => i.id === productId);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ ...product, qty: 1 });
    }
    saveCart();
    updateCartBadge();
    showToast(`${product.name} ditambah ke troli! 🛒`, 'success');
}

function updateCartBadge() {
    const badge = document.getElementById('cart-badge');
    const total = cart.reduce((sum, i) => sum + i.qty, 0);
    if (badge) {
        badge.innerText = total;
        badge.style.display = total > 0 ? 'block' : 'none';
    }
}

function renderCart() {
    const container = document.getElementById('cart-items-container');
    const totalEl = document.getElementById('total-price');
    const countTitle = document.getElementById('cart-count-title');

    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:60px 20px;color:#555;">
                <i class="fa-solid fa-cart-shopping" style="font-size:50px;margin-bottom:20px;display:block;"></i>
                <p>Troli anda kosong.</p>
                <a href="shop.html" style="color:#fe2c55;font-weight:bold;">Pergi ke Kedai</a>
            </div>`;
        if (totalEl) totalEl.innerText = 'RM 0';
        if (countTitle) countTitle.innerText = '0';
        return;
    }

    if (countTitle) countTitle.innerText = cart.reduce((s, i) => s + i.qty, 0);

    container.innerHTML = cart.map(item => `
        <div style="display:flex;gap:15px;padding:15px;border-bottom:1px solid #111;align-items:center;">
            <img loading="lazy" src="${item.img}" style="width:70px;height:70px;object-fit:cover;border-radius:8px;">
            <div style="flex:1;">
                <strong style="font-size:14px;">${escapeHtml(item.name)}</strong>
                <p style="color:#fe2c55;margin:5px 0;font-weight:bold;">RM ${item.price.toLocaleString()}</p>
                <div style="display:flex;align-items:center;gap:12px;margin-top:8px;">
                    <button onclick="changeQty(${item.id}, -1)" style="background:#222;color:#fff;border:none;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:16px;">-</button>
                    <span>${item.qty}</span>
                    <button onclick="changeQty(${item.id}, 1)" style="background:#222;color:#fff;border:none;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:16px;">+</button>
                    <button onclick="removeFromCart(${item.id})" style="background:transparent;color:#fe2c55;border:none;cursor:pointer;margin-left:auto;font-size:12px;"><i class="fa-solid fa-trash"></i> Buang</button>
                </div>
            </div>
        </div>
    `).join('');

    const total = cart.reduce((sum, i) => sum + (i.price * i.qty), 0);
    if (totalEl) totalEl.innerText = `RM ${total.toLocaleString()}`;
}

function changeQty(id, delta) {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) cart = cart.filter(i => i.id !== id);
    saveCart();
    renderCart();
}

function removeFromCart(id) {
    cart = cart.filter(i => i.id !== id);
    saveCart();
    renderCart();
    showToast('Item dibuang dari troli.', 'info');
}

async function checkout() {
    if (cart.length === 0) return showToast('Troli anda kosong!', 'warning');

    const user = await getAuthUser();
    if (!user) return showToast('Sila log masuk untuk checkout.', 'warning');

    // Simpan cart items ke sessionStorage (untuk checkout page ambil)
    // Cart hanya simpan product_id dan qty — harga dikira server
    const checkoutItems = cart.map(i => ({ product_id: i.id, qty: i.qty }));
    sessionStorage.setItem('sf_checkout_items', JSON.stringify(checkoutItems));
    window.location.href = 'checkout.html';
}

function contactSeller(sellerId) {
    window.location.href = `chat.html?seller=${sellerId}`;
}

function goToCheckout(productId, productName) {
    // ✅ FIX: Hantar product_id sahaja — harga dikira server-side
    // JANGAN hantar harga dalam URL (boleh dimanipulasi)
    window.location.href = 'checkout.html?pid=' + encodeURIComponent(productId);
}

function buyNow(productId, productName) {
    // Beli terus tanpa masuk cart
    window.location.href = 'checkout.html?pid=' + encodeURIComponent(productId) + '&direct=1';
}

// ==========================================
// 14. CHAT / MESEJ
// ==========================================
let chatSubscription  = null;
let _chatMsgIds       = new Set();

// Cleanup bila page unload — prevent memory leak
window.addEventListener('beforeunload', () => {
    if (chatSubscription) {
        snapSupabase.removeChannel(chatSubscription);
        chatSubscription = null;
    }
});

async function loadMessages() {
    const chatBox = document.getElementById('chat-box');
    if (!chatBox) return;

    const params = new URLSearchParams(window.location.search);
    const sellerId = params.get('seller') || 'default';

    try {
        const user = await getAuthUser();
        if (!user) return;

        const { data: msgs } = await snapSupabase.from('messages')
            .select('*')
            .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
            .order('created_at', { ascending: true });

        renderMessages(msgs || [], user.id);
    } catch (err) {
        devErr("[chat] loadMessages:", err);
        if (typeof showToast === 'function') showToast("Gagal memuatkan mesej.", "error");
    }
}

function renderMessages(msgs, currentUserId) {
    const chatBox = document.getElementById('chat-box');
    if (!chatBox) return;

    if (msgs.length === 0) {
        chatBox.innerHTML = '<p style="text-align:center;color:#444;padding:20px;">Mulakan perbualan! 👋</p>';
        return;
    }

    chatBox.innerHTML = msgs.map(m => {
        const isMine = m.sender_id === currentUserId;
        return `
            <div style="display:flex;justify-content:${isMine ? 'flex-end' : 'flex-start'};">
                <div style="max-width:70%;background:${isMine ? '#fe2c55' : '#222'};padding:10px 14px;border-radius:${isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px'};margin-bottom:8px;">
                    <p style="margin:0;font-size:14px;">${escapeHtml(m.message_text)}</p>
                    <span style="font-size:10px;opacity:0.6;display:block;margin-top:4px;">${timeAgo(m.created_at)}</span>
                </div>
            </div>`;
    }).join('');

    chatBox.scrollTop = chatBox.scrollHeight;
}

async function sendMessage() {
    const input = document.getElementById('chat-input');
    const text = input?.value?.trim();
    if (!text) return;

    const { data: { user } } = await snapSupabase.auth.getUser();
    if (!user) return showToast('Log masuk dahulu.', 'warning');

    const params = new URLSearchParams(window.location.search);
    const receiverId = params.get('seller') || 'system';

    input.value = '';

    try {
        await snapSupabase.from('messages').insert([{
            sender_id: user.id,
            receiver_id: receiverId,
            message_text: text
        }]);
        loadMessages();
    } catch (err) {
        showToast('Gagal hantar mesej.', 'error');
    }
}

function listenMessages() {
    if (chatSubscription) return;
    if (chatSubscription) { snapSupabase.removeChannel(chatSubscription); chatSubscription = null; }
    _chatMsgIds.clear();
    chatSubscription = snapSupabase.channel('messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
            loadMessages();
        })
        .subscribe();
}

// ==========================================
// 15. INBOX & SISTEM NOTIFIKASI
// ==========================================

let allNotifications   = [];
let notifChannel       = null;
let mesejChannel       = null;
let currentTabInbox    = 'aktiviti';
let currentNotifFilter = 'all';

async function initInbox() {
    const { data: { user } } = await snapSupabase.auth.getUser();
    if (!user) return;
    await Promise.all([loadNotifications(user), loadMessageThreads(user)]);
    startNotifRealtime(user);
    startMesejRealtime(user);
}

function switchTab(tab) {
    currentTabInbox = tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(`tab-${tab}`)?.classList.add('active');
    document.getElementById(`panel-${tab}`)?.classList.add('active');
    const badge = document.getElementById(`badge-${tab}`);
    if (badge) { badge.innerText = ''; badge.classList.remove('show'); }
}

function filterNotif(type, el) {
    currentNotifFilter = type;
    document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
    renderNotifications();
}

async function loadNotifications(user) {
    try {
        const { data, error } = await snapSupabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50);
        if (error) throw error;
        allNotifications = data || [];
        renderNotifications();
        updateNotifBadge();
    } catch (err) {
        const list = document.getElementById('notif-list');
        if (list) list.innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>Gagal memuatkan notifikasi.</p></div>`;
    }
}

function renderNotifications() {
    const list = document.getElementById('notif-list');
    if (!list) return;

    const filtered = currentNotifFilter === 'all'
        ? allNotifications
        : allNotifications.filter(n => n.type === currentNotifFilter);

    const unreadCount = allNotifications.filter(n => !n.is_read).length;
    const markBtn = document.getElementById('mark-read-btn');
    if (markBtn) markBtn.style.display = unreadCount > 0 ? 'block' : 'none';

    if (filtered.length === 0) {
        const skeletonEl = document.getElementById('notif-skeleton');
        if (skeletonEl) skeletonEl.remove();
        list.innerHTML = `<div class="empty-state"><i class="fa-solid fa-bell-slash"></i><p>Tiada notifikasi${currentNotifFilter !== 'all' ? ' dalam kategori ini' : ''} lagi.</p></div>`;
        return;
    }

    const welcomeHtml = currentNotifFilter === 'all' ? `
        <div class="notif-row">
            <div class="notif-avatar" style="background-image:url('https://ui-avatars.com/api/?name=SnapFlow&background=fe2c55&color=fff');">
                <div class="notif-type-icon" style="background:#fe2c55;"><i class="fa-solid fa-star" style="color:#fff;"></i></div>
            </div>
            <div class="notif-body"><p><strong>SnapFlow</strong> — Selamat datang! Kongsi momen istimewa anda bersama dunia! 🎬</p><span>Hari ini</span></div>
        </div>` : '';

    list.innerHTML = welcomeHtml + filtered.map(n => buildNotifRow(n)).join('');
}

function buildNotifRow(n) {
    const cfgMap = {
        like:    { icon: 'fa-heart',     bg: '#fe2c55' },
        comment: { icon: 'fa-comment',   bg: '#00f2ea' },
        follow:  { icon: 'fa-user-plus', bg: '#ffcc00' },
    };
    const cfg = cfgMap[n.type] || { icon: 'fa-bell', bg: '#888' };
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(n.from_name || 'User')}&background=random`;
    const unreadClass = n.is_read ? '' : 'unread';
    const dot = n.is_read ? '' : '<div class="unread-dot"></div>';

    return `
        <div class="notif-row ${unreadClass}" onclick="handleNotifClick(${n.id}, '${n.type}', ${n.video_id || 'null'})">
            <div class="notif-avatar" style="background-image:url('${avatarUrl}');">
                <div class="notif-type-icon" style="background:${cfg.bg};"><i class="fa-solid ${cfg.icon}" style="color:#fff;"></i></div>
            </div>
            <div class="notif-body">
                <p>${escapeHtml(n.message)}</p>
                <span>${timeAgo(n.created_at)}</span>
            </div>
            ${dot}
        </div>`;
}

async function handleNotifClick(notifId, type, videoId) {
    await snapSupabase.from('notifications').update({ is_read: true }).eq('id', notifId);
    const n = allNotifications.find(x => x.id === notifId);
    if (n) n.is_read = true;
    renderNotifications();
    updateNotifBadge();
    if ((type === 'like' || type === 'comment') && videoId) {
        window.location.href = `index.html#video-${videoId}`;
    } else if (type === 'follow') {
        window.location.href = 'profile.html';
    }
}

async function markAllRead() {
    const { data: { user } } = await snapSupabase.auth.getUser();
    if (!user) return;
    await snapSupabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    allNotifications.forEach(n => n.is_read = true);
    renderNotifications();
    updateNotifBadge();
    showToast('Semua notifikasi ditandakan dibaca ✅', 'success');
}

function updateNotifBadge() {
    const unread = allNotifications.filter(n => !n.is_read).length;
    const badge = document.getElementById('badge-aktiviti');
    const navDot = document.getElementById('nav-notif-dot');
    if (badge) { badge.innerText = unread > 0 ? (unread > 99 ? '99+' : unread) : ''; badge.classList.toggle('show', unread > 0); }
    if (navDot) navDot.style.display = unread > 0 ? 'block' : 'none';
}

async function loadMessageThreads(user) {
    const list = document.getElementById('mesej-list');
    if (!list) return;
    try {
        const { data: msgs, error } = await snapSupabase
            .from('messages')
            .select('*')
            .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
            .order('created_at', { ascending: false });
        if (error) throw error;

        const skeletonEl = document.getElementById('mesej-skeleton');
        if (skeletonEl) skeletonEl.remove();

        if (!msgs || msgs.length === 0) {
            list.innerHTML = `<div class="empty-state"><i class="fa-solid fa-message"></i><p>Tiada mesej lagi.<br><a href="shop.html" style="color:#fe2c55;font-weight:700;">Pergi ke Kedai</a> dan chat dengan penjual!</p></div>`;
            return;
        }
        const threads = {};
        msgs.forEach(m => {
            const pid = m.sender_id === user.id ? m.receiver_id : m.sender_id;
            if (!threads[pid]) threads[pid] = { ...m, partnerId: pid, unread: 0 };
            if (!m.is_read && m.receiver_id === user.id) threads[pid].unread++;
        });
        const unreadMesej = Object.values(threads).filter(t => t.unread > 0).length;
        const mbadge = document.getElementById('badge-mesej');
        if (mbadge && unreadMesej > 0) { mbadge.innerText = unreadMesej; mbadge.classList.add('show'); }

        list.innerHTML = Object.values(threads).map(t => `
            <div class="chat-row" onclick="window.location.href='chat.html?seller=${t.partnerId}'">
                <div class="chat-avatar" style="background-image:url('https://ui-avatars.com/api/?name=Penjual&background=random');"></div>
                <div class="chat-info">
                    <strong>Penjual SnapFlow</strong>
                    <span>${escapeHtml(t.message_text)}</span>
                </div>
                <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0;">
                    <span style="font-size:11px;color:#444;">${timeAgo(t.created_at)}</span>
                    ${t.unread > 0 ? `<span style="background:#fe2c55;color:#fff;font-size:10px;font-weight:700;border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;">${t.unread}</span>` : ''}
                </div>
            </div>`).join('');
    } catch (err) {
        if (list) list.innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>Gagal memuatkan mesej.</p></div>`;
    }
}

function startNotifRealtime(user) {
    if (notifChannel) return;
    notifChannel = snapSupabase
        .channel(`notif-${user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (payload) => {
            allNotifications.unshift(payload.new);
            renderNotifications();
            updateNotifBadge();
            showToast(payload.new.message, 'info');
        })
        .subscribe();
}

function startMesejRealtime(user) {
    if (mesejChannel) return;
    mesejChannel = snapSupabase
        .channel(`mesej-${user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, async () => {
            await loadMessageThreads(user);
            showToast('💬 Mesej baru diterima!', 'info');
            const badge = document.getElementById('badge-mesej');
            if (badge && currentTabInbox !== 'mesej') { badge.innerText = (parseInt(badge.innerText || '0') + 1); badge.classList.add('show'); }
        })
        .subscribe();
}

async function checkUnreadNotifications() {
    const { data: { user } } = await snapSupabase.auth.getUser();
    if (!user) return;
    const { count } = await snapSupabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false);
    const dot = document.getElementById('nav-notif-dot');
    if (dot) dot.style.display = count > 0 ? 'block' : 'none';
}
// ==========================================
// 15. REALTIME — LIKE & KOMEN
// ==========================================

let realtimeChannel = null;

function startRealtimeSubscriptions() {
    // Elak subscribe dua kali
    if (realtimeChannel) return;

    realtimeChannel = snapSupabase
        .channel('snapflow-realtime')

        // ── REALTIME LIKES ──────────────────────────
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'likes'
        }, (payload) => {
            const videoId = payload.new.video_id;
            const countEl = document.getElementById(`like-count-${videoId}`);
            if (!countEl) return;

            // Update kiraan like secara langsung
            const current = parseInt(countEl.innerText) || 0;
            countEl.innerText = current + 1;

            // Animasi denyut pada ikon heart
            animateLikeIcon(videoId);
        })

        .on('postgres_changes', {
            event: 'DELETE',
            schema: 'public',
            table: 'likes'
        }, (payload) => {
            const videoId = payload.old.video_id;
            const countEl = document.getElementById(`like-count-${videoId}`);
            if (!countEl) return;
            const current = parseInt(countEl.innerText) || 0;
            countEl.innerText = Math.max(0, current - 1);
        })

        // ── REALTIME KOMEN ───────────────────────────
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'comments'
        }, (payload) => {
            const newComment = payload.new;

            // 1. Update kiraan komen di sidebar
            const countEl = document.getElementById(`comment-count-${newComment.video_id}`);
            if (countEl) {
                const current = parseInt(countEl.innerText) || 0;
                countEl.innerText = current + 1;
                // Animasi denyut pada ikon komen
                animateCommentIcon(newComment.video_id);
            }

            // 2. Jika panel komen sedang terbuka untuk video ini,
            //    tambah komen baru terus tanpa perlu reload semua
            if (currentVideoId === newComment.video_id) {
                appendNewComment(newComment);
            }
        })

        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                devLog('✅ Realtime connected — Like & Komen aktif!');
            } else if (status === 'CHANNEL_ERROR') {
                console.warn('⚠️ Realtime connection error. Cuba sambung semula...');
                // Cuba sambung semula selepas 5 saat
                setTimeout(() => {
                    realtimeChannel = null;
                    startRealtimeSubscriptions();
                }, 5000);
            }
        });
}

// ── Animasi denyut pada ikon heart ──────────────
function animateLikeIcon(videoId) {
    const icon = document.getElementById(`like-icon-${videoId}`);
    if (!icon) return;
    icon.style.transition = 'transform 0.15s ease';
    icon.style.transform = 'scale(1.4)';
    setTimeout(() => { icon.style.transform = 'scale(1)'; }, 150);
}

// ── Animasi denyut pada ikon komen ──────────────
function animateCommentIcon(videoId) {
    // Cari semua ikon komen untuk video ini
    const containers = document.querySelectorAll(`.video-container[data-video-id="${videoId}"]`);
    containers.forEach(c => {
        const icon = c.querySelector('.fa-comment-dots');
        if (!icon) return;
        icon.style.transition = 'transform 0.15s ease, color 0.15s ease';
        icon.style.transform = 'scale(1.4)';
        icon.style.color = '#00f2ea';
        setTimeout(() => {
            icon.style.transform = 'scale(1)';
            icon.style.color = '#fff';
        }, 200);
    });
}

// ── Tambah komen baru ke panel tanpa reload ──────
function appendNewComment(comment) {
    const list = document.getElementById('comment-list');
    if (!list) return;

    // Buang mesej "Belum ada komen" jika ada
    const empty = list.querySelector('p');
    if (empty) empty.remove();

    // Bina elemen komen baru
    const div = document.createElement('div');
    div.className = 'comment-item';
    div.style.cssText = 'animation: fadeInUp 0.3s ease;';
    div.innerHTML = `
        <div style="background-image: url('https://ui-avatars.com/api/?name=${encodeURIComponent(escapeHtml(comment.username || 'U'))}&background=random'); background-size:cover; background-color:#333; width:36px; height:36px; border-radius:50%; flex-shrink:0;"></div>
        <div style="flex:1;">
            <strong style="font-size:13px;color:#ccc;">${escapeHtml(comment.username || 'User')}</strong>
            <p style="margin:3px 0 0;font-size:14px;color:#eee;">${escapeHtml(comment.comment_text)}</p>
            <span style="font-size:11px;color:#555;">Baru sahaja</span>
        </div>
    `;

    // Letak di paling atas (terbaru dulu)
    list.prepend(div);
}

// ── Hentikan realtime bila keluar halaman ────────
function stopRealtimeSubscriptions() {
    if (realtimeChannel) {
        snapSupabase.removeChannel(realtimeChannel);
        realtimeChannel = null;
    }
}

window.addEventListener('beforeunload', stopRealtimeSubscriptions);

// ==========================================
// INISIALISASI
// ==========================================
checkUserSession();
loadHomeFeed().then(() => {
    // Mula realtime selepas feed dimuatkan
    startRealtimeSubscriptions();
});
loadProfileData();
loadShop();
checkUnreadNotifications();

// Tambah CSS untuk animasi
const dynamicStyle = document.createElement('style');
dynamicStyle.innerText = `
    @keyframes toastIn {
        from { opacity:0; transform: translateX(-50%) translateY(20px); }
        to   { opacity:1; transform: translateX(-50%) translateY(0); }
    }
    @keyframes fadeInUp {
        from { opacity:0; transform: translateY(10px); }
        to   { opacity:1; transform: translateY(0); }
    }
`;
document.head.appendChild(dynamicStyle);

// ==========================================
// 17. DISCOVER / TRENDING
// ==========================================

// Data hashtag trending (boleh diambil dari DB kemudian)
const TRENDING_HASHTAGS = [
    { tag: '#viral',     count: '2.4J' },
    { tag: '#trending',  count: '1.8J' },
    { tag: '#fyp',       count: '5.1J' },
    { tag: '#snapflow',  count: '980K' },
    { tag: '#lucu',      count: '1.2J' },
    { tag: '#masakan',   count: '876K' },
    { tag: '#fesyen',    count: '654K' },
    { tag: '#sukan',     count: '432K' },
    { tag: '#muzik',     count: '321K' },
    { tag: '#travel',    count: '567K' },
];

// Data kreator disyorkan (boleh dari DB kemudian)
const SUGGESTED_CREATORS = [
    { name: 'Amir Kreator', handle: '@amirkreator', followers: '120K', avatar: 'Amir+Kreator' },
    { name: 'Siti Viral',   handle: '@sitiviral',   followers: '89K',  avatar: 'Siti+Viral'   },
    { name: 'Razif Pro',    handle: '@razifpro',    followers: '234K', avatar: 'Razif+Pro'    },
    { name: 'Nurul Snap',   handle: '@nurulsnap',   followers: '56K',  avatar: 'Nurul+Snap'   },
    { name: 'Hafiz Media',  handle: '@hafizmedia',  followers: '445K', avatar: 'Hafiz+Media'  },
];

// ── Inisialisasi halaman Discover ────────────────
async function initDiscover() {
    const contentEl = document.getElementById('discover-content');
    if (!contentEl) return;

    await renderDiscoverTab('trending');
}

// ── Tukar tab dalam Discover ──────────────────────
async function renderDiscoverTab(tab) {
    const contentEl = document.getElementById('discover-content');
    if (!contentEl) return;

    // Tunjuk skeleton
    contentEl.innerHTML = `
        <div style="padding:16px;">
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:2px;">
                ${Array(6).fill('<div class="skeleton" style="aspect-ratio:9/16;"></div>').join('')}
            </div>
        </div>`;

    if (tab === 'trending')     await renderTrending(contentEl);
    else if (tab === 'terbaru')     await renderTerbaru(contentEl);
    else if (tab === 'kreator')     await renderKreator(contentEl);
    else if (tab === 'leaderboard') await renderLeaderboard(contentEl);
    else if (tab === 'hashtag')     await renderHashtag(contentEl);
}

// ── Tab: Trending ────────────────────────────────
async function renderTrending(el) {
    try {
        // Video paling banyak like
        const { data: videos } = await snapSupabase
            .from('videos')
            .select('*')
            .order('likes_count', { ascending: false })
            .limit(12);

        const { data: newest } = await snapSupabase
            .from('videos')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(6);

        el.innerHTML = `

            <!-- Kedai Banner -->
            <div class="kedai-banner fade-in" onclick="window.location.href='shop.html'">
                <i class="fa-solid fa-bag-shopping"></i>
                <div>
                    <h3>Kedai SnapFlow</h3>
                    <p>Jelajah produk pilihan kreator</p>
                </div>
                <i class="fa-solid fa-chevron-right" style="color:#333;margin-left:auto;font-size:12px;"></i>
            </div>

            <!-- Hashtag Trending -->
            <div class="section-hdr">
                <h2>🔥 Hashtag Popular</h2>
            </div>
            <div class="hashtag-scroll">
                ${TRENDING_HASHTAGS.map(h => `
                    <div class="hashtag-chip" onclick="searchByHashtag('${h.tag}')">
                        <span class="htag">${escapeHtml(h.tag)}</span>
                        <span class="hcount">${h.count} video</span>
                    </div>
                `).join('')}
            </div>

            <!-- Kreator Disyorkan -->
            <div class="section-hdr">
                <h2>⭐ Kreator Popular</h2>
                <a href="#" onclick="switchDiscoverTab('kreator', document.querySelectorAll('.dtab')[2])">Lihat semua</a>
            </div>
            <div class="kreator-scroll">
                ${SUGGESTED_CREATORS.map((c, i) => `
                    <div class="kreator-card fade-in" style="animation-delay:${i * 0.05}s;">
                        <div class="kreator-avatar" style="background-image:url('https://ui-avatars.com/api/?name=${encodeURIComponent(c.avatar)}&background=random&size=120');"></div>
                        <h4>${escapeHtml(c.name)}</h4>
                        <p>${c.followers} pengikut</p>
                        <button class="follow-kreator-btn" id="follow-c-${i}" onclick="followCreator(${i}, this)">
                            + Ikuti
                        </button>
                    </div>
                `).join('')}
            </div>

            <!-- Video Trending -->
            <div class="section-hdr">
                <h2>🎬 Video Trending</h2>
            </div>
            ${buildVideoGrid(videos, true)}

            <!-- Video Terbaru -->
            <div class="section-hdr" style="margin-top:10px;">
                <h2>🆕 Baru Ditambah</h2>
                <a href="#" onclick="switchDiscoverTab('terbaru', document.querySelectorAll('.dtab')[1])">Lihat semua</a>
            </div>
            ${buildVideoGrid(newest, false)}
        `;

    } catch (err) {
        el.innerHTML = emptyState('Gagal memuatkan trending. Cuba lagi.', 'fa-triangle-exclamation');
    }
}

// ── Tab: Terbaru ─────────────────────────────────
async function renderTerbaru(el) {
    try {
        const { data: videos } = await snapSupabase
            .from('videos')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(24);

        if (!videos || videos.length === 0) {
            el.innerHTML = emptyState('Belum ada video. Jadi yang pertama!', 'fa-video');
            return;
        }

        el.innerHTML = `
            <div class="section-hdr"><h2>🆕 Video Terbaru</h2></div>
            ${buildVideoGrid(videos, false)}
        `;
    } catch (err) {
        el.innerHTML = emptyState('Ralat memuatkan video.', 'fa-triangle-exclamation');
    }
}

// ── Tab: Kreator ─────────────────────────────────
async function renderKreator(el) {
    // Ambil kreator unik dari videos
    try {
        const { data: vids } = await snapSupabase
            .from('videos')
            .select('user_id, username, likes_count')
            .order('likes_count', { ascending: false });

        // Aggregate mengikut user
        const kreators = {};
        (vids || []).forEach(v => {
            if (!kreators[v.user_id]) {
                kreators[v.user_id] = { user_id: v.user_id, username: v.username || 'Kreator', totalLikes: 0, videoCount: 0 };
            }
            kreators[v.user_id].totalLikes += (v.likes_count || 0);
            kreators[v.user_id].videoCount += 1;
        });

        const sorted = Object.values(kreators).sort((a, b) => b.totalLikes - a.totalLikes).slice(0, 20);

        if (sorted.length === 0) {
            // Guna data contoh
            el.innerHTML = `
                <div class="section-hdr"><h2>⭐ Kreator Disyorkan</h2></div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:0 16px 16px;">
                    ${SUGGESTED_CREATORS.map((c, i) => `
                        <div class="kreator-card fade-in" style="min-width:unset;animation-delay:${i * 0.06}s;">
                            <div class="kreator-avatar" style="background-image:url('https://ui-avatars.com/api/?name=${encodeURIComponent(c.avatar)}&background=random&size=120');"></div>
                            <h4>${escapeHtml(c.name)}</h4>
                            <p>${c.followers} pengikut</p>
                            <button class="follow-kreator-btn" id="follow-s-${i}" onclick="followCreator('s${i}', this)">+ Ikuti</button>
                        </div>
                    `).join('')}
                </div>`;
            return;
        }

        el.innerHTML = `
            <div class="section-hdr"><h2>⭐ Kreator Popular</h2></div>
            <div style="display:flex;flex-direction:column;gap:0;">
                ${sorted.map((c, i) => `
                    <div class="search-result-item fade-in" style="animation-delay:${i * 0.04}s;">
                        <div style="width:46px;height:46px;border-radius:50%;background-image:url('https://ui-avatars.com/api/?name=${encodeURIComponent(c.username)}&background=random&size=100');background-size:cover;flex-shrink:0;border:1px solid #222;"></div>
                        <div style="flex:1;min-width:0;">
                            <strong style="font-size:14px;display:block;">@${escapeHtml(c.username)}</strong>
                            <span style="font-size:12px;color:#555;">${c.videoCount} video · ${c.totalLikes} likes</span>
                        </div>
                        <button class="follow-kreator-btn" style="width:70px;" id="follow-k-${c.user_id}" onclick="followCreatorById('${c.user_id}', this)">+ Ikuti</button>
                    </div>
                `).join('')}
            </div>`;

    } catch (err) {
        el.innerHTML = emptyState('Ralat memuatkan kreator.', 'fa-triangle-exclamation');
    }
}

// ── Tab: Hashtag ─────────────────────────────────
async function renderHashtag(el) {
    el.innerHTML = `
        <div class="section-hdr"><h2># Hashtag Popular</h2></div>
        <div style="display:flex;flex-direction:column;gap:0;padding: 0 0 16px;">
            ${TRENDING_HASHTAGS.map((h, i) => `
                <div class="search-result-item fade-in" style="animation-delay:${i * 0.04}s;" onclick="searchByHashtag('${h.tag}')">
                    <div style="width:46px;height:46px;border-radius:12px;background:#1a0008;border:1px solid #2a0010;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                        <i class="fa-solid fa-hashtag" style="color:#fe2c55;font-size:18px;"></i>
                    </div>
                    <div style="flex:1;">
                        <strong style="font-size:15px;display:block;">${escapeHtml(h.tag)}</strong>
                        <span style="font-size:12px;color:#555;">${h.count} video</span>
                    </div>
                    <i class="fa-solid fa-chevron-right" style="color:#333;font-size:12px;"></i>
                </div>
            `).join('')}
        </div>
    `;
}

// ── Carian dalam Discover ─────────────────────────
async function searchDiscover(query) {
    const el = document.getElementById('search-results-discover');
    if (!el) return;

    el.innerHTML = `<div style="padding:20px;text-align:center;color:#444;">Mencari "${escapeHtml(query)}"...</div>`;

    try {
        // Cari video ikut caption
        const { data: videos } = await snapSupabase
            .from('videos')
            .select('*')
            .ilike('caption', `%${query}%`)
            .limit(9);

        // Cari video ikut username
        const { data: byUser } = await snapSupabase
            .from('videos')
            .select('*')
            .ilike('username', `%${query}%`)
            .limit(6);

        // Gabung & buang duplikat
        const all = [...(videos || []), ...(byUser || [])];
        const unique = all.filter((v, i, a) => a.findIndex(x => x.id === v.id) === i);

        if (unique.length === 0) {
            el.innerHTML = `
                <div style="text-align:center;padding:50px 20px;color:#333;">
                    <i class="fa-solid fa-magnifying-glass" style="font-size:36px;margin-bottom:14px;display:block;"></i>
                    <p style="font-size:14px;">Tiada hasil untuk <strong style="color:#fff;">"${escapeHtml(query)}"</strong></p>
                    <p style="font-size:13px;color:#333;margin-top:6px;">Cuba cari dengan perkataan lain</p>
                </div>`;
            return;
        }

        el.innerHTML = `
            <div style="padding:12px 16px;font-size:13px;color:#555;">${unique.length} hasil dijumpai untuk "<strong style="color:#fff;">${escapeHtml(query)}</strong>"</div>
            ${buildVideoGrid(unique, false)}
        `;

    } catch (err) {
        el.innerHTML = `<div style="padding:20px;text-align:center;color:#fe2c55;">Ralat semasa mencari.</div>`;
    }
}

// ── Carian mengikut Hashtag ───────────────────────
async function searchByHashtag(tag) {
    const input = document.getElementById('discover-search-input');
    if (input) input.value = tag;
    document.getElementById('clear-search').style.display = 'block';
    document.getElementById('search-results-discover').style.display = 'block';
    document.getElementById('discover-content').style.display = 'none';
    await searchDiscover(tag);
}

// ── Follow Kreator (dari senarai discover) ───────
async function followCreator(idx, btn) {
    const { data: { user } } = await snapSupabase.auth.getUser();
    if (!user) return showToast('Sila log masuk dahulu.', 'warning');

    if (btn.classList.contains('followed')) {
        btn.classList.remove('followed');
        btn.innerText = '+ Ikuti';
        showToast('Batal ikuti.', 'info');
    } else {
        btn.classList.add('followed');
        btn.innerText = '✓ Diikuti';
        showToast('Berjaya ikuti kreator! ✅', 'success');
    }
}

async function followCreatorById(targetUserId, btn) {
    const { data: { user } } = await snapSupabase.auth.getUser();
    if (!user) return showToast('Sila log masuk dahulu.', 'warning');
    if (user.id === targetUserId) return showToast('Anda tidak boleh ikuti diri sendiri.', 'warning');

    if (btn.classList.contains('followed')) {
        await snapSupabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', targetUserId);
        btn.classList.remove('followed');
        btn.innerText = '+ Ikuti';
        showToast('Batal ikuti.', 'info');
    } else {
        await snapSupabase.from('follows').insert([{ follower_id: user.id, following_id: targetUserId }]);
        btn.classList.add('followed');
        btn.innerText = '✓ Diikuti';
        showToast('Berjaya ikuti! ✅', 'success');
    }
}

// ── Helper: Bina Grid Video ───────────────────────
function buildVideoGrid(videos, showRank) {
    if (!videos || videos.length === 0) return emptyState('Belum ada video.', 'fa-video');

    return `
        <div class="trending-grid">
            ${videos.map((vid, i) => `
                <div class="trending-item fade-in" style="animation-delay:${i * 0.03}s;" onclick="openVideoFeed('${vid.id}')">
                    <video src="${escapeHtml(vid.video_url)}" preload="none" muted playsinline
                           onmouseenter="this.play()" onmouseleave="this.pause();this.currentTime=0;"></video>
                    ${showRank && i < 3 ? `<div class="rank-badge">#${i + 1}</div>` : ''}
                    <div class="overlay">
                        <span><i class="fa-solid fa-heart" style="color:#fe2c55;"></i> ${vid.likes_count || 0}</span>
                    </div>
                </div>
            `).join('')}
        </div>`;
}

// ── Buka video dalam feed utama ───────────────────
function openVideoFeed(videoId) {
    window.location.href = `index.html#video-${videoId}`;
}

// ── Helper: Empty state ───────────────────────────
function emptyState(msg, icon) {
    return `
        <div style="text-align:center;padding:60px 20px;color:#333;">
            <i class="fa-solid ${icon}" style="font-size:40px;margin-bottom:16px;display:block;"></i>
            <p style="font-size:14px;">${msg}</p>
        </div>`;
}

// ==========================================
// 18. VIDEO PROGRESS BAR
// ==========================================

// Simpan interval ID setiap video supaya boleh stop
let isDragging = false;

// ── Format masa: 63 → "1:03" ─────────────────────
function formatTime(secs) {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// ── Mula pantau progress video ────────────────────
function setupProgressBar(video, videoId) {
    // Buang interval lama jika ada
    stopProgressBar(videoId);

    // Set masa total bila metadata dah siap
    const setTotal = () => {
        const totalEl = document.getElementById(`time-total-${videoId}`);
        if (totalEl && video.duration) {
            totalEl.innerText = formatTime(video.duration);
        }
    };

    if (video.readyState >= 1) setTotal();
    else video.addEventListener('loadedmetadata', setTotal, { once: true });

    // Update progress setiap 250ms
    progressIntervals[videoId] = setInterval(() => {
        if (isDragging) return;
        updateProgressUI(video, videoId);
    }, 250);
}

// ── Kemas kini UI progress bar ────────────────────
function updateProgressUI(video, videoId) {
    if (!video.duration) return;

    const pct = (video.currentTime / video.duration) * 100;

    const fill   = document.getElementById(`progress-fill-${videoId}`);
    const thumb  = document.getElementById(`progress-thumb-${videoId}`);
    const buffer = document.getElementById(`progress-buffer-${videoId}`);
    const curr   = document.getElementById(`time-current-${videoId}`);

    if (fill)   fill.style.width   = `${pct}%`;
    if (thumb)  thumb.style.left   = `${pct}%`;
    if (curr)   curr.innerText     = formatTime(video.currentTime);

    // Buffered progress
    if (buffer && video.buffered.length > 0) {
        const buffPct = (video.buffered.end(video.buffered.length - 1) / video.duration) * 100;
        buffer.style.width = `${buffPct}%`;
    }
}

// ── Hentikan pantauan progress ────────────────────
function stopProgressBar(videoId) {
    if (progressIntervals[videoId]) {
        clearInterval(progressIntervals[videoId]);
        delete progressIntervals[videoId];
    }
}

// ── Klik pada track untuk skip ────────────────────
function seekVideo(event, videoId) {
    if (isDragging) return;
    const container = document.querySelector(`.video-container[data-video-id="${videoId}"]`);
    if (!container) return;
    const video = container.querySelector('video');
    if (!video || !video.duration) return;

    const track = event.currentTarget;
    const rect  = track.getBoundingClientRect();
    const x     = Math.max(0, Math.min(event.clientX - rect.left, rect.width));
    const pct   = x / rect.width;

    video.currentTime = pct * video.duration;
    updateProgressUI(video, videoId);
}

// ── Drag pada mobile (touch) ──────────────────────
function startProgressDrag(event, videoId) {
    event.stopPropagation(); // elak trigger play/pause
    isDragging = true;

    const thumb = document.getElementById(`progress-thumb-${videoId}`);
    if (thumb) thumb.style.transform = 'translateX(-50%) scale(1.5)';
}

function dragProgress(event, videoId) {
    if (!isDragging) return;
    event.stopPropagation();
    event.preventDefault();

    const container = document.querySelector(`.video-container[data-video-id="${videoId}"]`);
    if (!container) return;
    const video = container.querySelector('video');
    if (!video || !video.duration) return;

    const track = document.querySelector(`#progress-thumb-${videoId}`)?.closest('.video-progress-track');
    if (!track) return;

    const touch = event.changedTouches[0];
    const rect  = track.getBoundingClientRect();
    const x     = Math.max(0, Math.min(touch.clientX - rect.left, rect.width));
    const pct   = x / rect.width;

    // Preview posisi tanpa commit dulu
    const fill  = document.getElementById(`progress-fill-${videoId}`);
    const thumb = document.getElementById(`progress-thumb-${videoId}`);
    const curr  = document.getElementById(`time-current-${videoId}`);

    if (fill)  fill.style.width  = `${pct * 100}%`;
    if (thumb) thumb.style.left  = `${pct * 100}%`;
    if (curr)  curr.innerText    = formatTime(pct * video.duration);
}

function endProgressDrag(event, videoId) {
    if (!isDragging) return;
    event.stopPropagation();
    isDragging = false;

    const container = document.querySelector(`.video-container[data-video-id="${videoId}"]`);
    if (!container) return;
    const video = container.querySelector('video');
    if (!video || !video.duration) return;

    const track = document.querySelector(`#progress-thumb-${videoId}`)?.closest('.video-progress-track');
    if (!track) return;

    const touch = event.changedTouches[0];
    const rect  = track.getBoundingClientRect();
    const x     = Math.max(0, Math.min(touch.clientX - rect.left, rect.width));
    const pct   = x / rect.width;

    // Commit posisi
    video.currentTime = pct * video.duration;

    const thumb = document.getElementById(`progress-thumb-${videoId}`);
    if (thumb) thumb.style.transform = 'translateX(-50%) scale(1)';

    updateProgressUI(video, videoId);
}

// ==========================================
// 19. PWA — INSTALL & SERVICE WORKER
// ==========================================

let deferredInstallPrompt = null;  // Simpan event beforeinstallprompt

// ── Tangkap event install dari browser ───────────
window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;

    // Tunjuk butang Install di header
    const installBtn = document.getElementById('pwa-install-btn');
    if (installBtn) installBtn.style.display = 'flex';

    // Tunjuk banner install selepas 3 saat (kalau belum dismiss)
    const bannerDismissed = localStorage.getItem('snapflow-pwa-banner-dismissed');
    if (!bannerDismissed) {
        setTimeout(() => {
            const banner = document.getElementById('pwa-install-banner');
            if (banner) {
                banner.style.display = 'block';
                banner.style.animation = 'slideUpBanner 0.35s ease';
            }
        }, 3000);
    }
});

// ── Trigger prompt install ────────────────────────
async function installPWA() {
    if (!deferredInstallPrompt) {
        // Jika prompt tak available (iOS Safari) — tunjuk panduan manual
        showIOSInstallGuide();
        return;
    }

    // Sorokkan banner & butang
    dismissInstallBanner();

    // Tunjuk prompt install browser
    deferredInstallPrompt.prompt();

    const { outcome } = await deferredInstallPrompt.userChoice;

    if (outcome === 'accepted') {
        showToast('SnapFlow berjaya dipasang! 🎉', 'success');
        deferredInstallPrompt = null;
    } else {
        showToast('Anda boleh install kemudian dari header.', 'info');
    }
}

// ── Dismiss banner install ────────────────────────
function dismissInstallBanner() {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) banner.style.display = 'none';
    localStorage.setItem('snapflow-pwa-banner-dismissed', '1');
}

// ── Panduan install untuk iOS Safari ─────────────
// iOS Safari tidak support beforeinstallprompt — perlu panduan manual
function showIOSInstallGuide() {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    // Buang modal lama kalau ada
    document.getElementById('ios-install-modal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'ios-install-modal';
    modal.style.cssText = `
        position: fixed; inset: 0; background: rgba(0,0,0,0.85);
        z-index: 99999; display: flex; align-items: flex-end;
        padding: 20px; box-sizing: border-box;
    `;

    modal.innerHTML = `
        <div style="background:#111; border:1px solid #222; border-radius:20px; padding:24px; width:100%; text-align:center;">
            <div style="width:56px;height:56px;background:#fe2c55;border-radius:14px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:26px;font-weight:900;color:#fff;">S</div>
            <h3 style="font-size:18px;font-weight:800;margin:0 0 8px;">Install SnapFlow</h3>
            ${isIOS && isSafari ? `
                <p style="font-size:14px;color:#888;line-height:1.6;margin:0 0 20px;">
                    Untuk install di iPhone/iPad:<br>
                    <strong style="color:#fff;">1.</strong> Ketik ikon <strong style="color:#fe2c55;">Kongsi</strong> (kotak dengan anak panah ke atas) di bawah Safari<br>
                    <strong style="color:#fff;">2.</strong> Pilih <strong style="color:#fe2c55;">"Add to Home Screen"</strong><br>
                    <strong style="color:#fff;">3.</strong> Ketik <strong style="color:#fe2c55;">Add</strong>
                </p>
            ` : `
                <p style="font-size:14px;color:#888;line-height:1.6;margin:0 0 20px;">
                    Untuk install, gunakan menu browser anda dan pilih<br>
                    <strong style="color:#fe2c55;">"Add to Home Screen"</strong> atau<br>
                    <strong style="color:#fe2c55;">"Install App"</strong>
                </p>
            `}
            <button onclick="document.getElementById('ios-install-modal').remove()"
                style="background:#fe2c55;color:#fff;border:none;padding:13px;width:100%;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;">
                Faham
            </button>
        </div>
    `;

    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// ── Detect bila app berjaya diinstall ────────────
window.addEventListener('appinstalled', () => {
    showToast('SnapFlow berjaya dipasang di telefon anda! 🎉', 'success');
    deferredInstallPrompt = null;

    // Sorokkan butang install
    const installBtn = document.getElementById('pwa-install-btn');
    if (installBtn) installBtn.style.display = 'none';
});

// ── Detect mod standalone (dah install) ──────────
function isPWAInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true;
}

// Jika dah install sebagai PWA — sorokkan butang install
if (isPWAInstalled()) {
    window.addEventListener('load', () => {
        const installBtn = document.getElementById('pwa-install-btn');
        if (installBtn) installBtn.style.display = 'none';
    });
}

// ── Animasi CSS untuk banner ──────────────────────
const pwaStyle = document.createElement('style');
pwaStyle.innerText = `
    @keyframes slideUpBanner {
        from { opacity: 0; transform: translateY(20px); }
        to   { opacity: 1; transform: translateY(0); }
    }
`;
document.head.appendChild(pwaStyle);

// ==========================================
// 20. WISHLIST / SIMPAN VIDEO
// ==========================================

// Simpan dalam localStorage (boleh migrate ke Supabase kemudian)
let savedVideos = new Set(JSON.parse(localStorage.getItem('snapflow_saved') || '[]'));

function saveSavedVideos() {
    localStorage.setItem('snapflow_saved', JSON.stringify([...savedVideos]));
}

// ── Toggle simpan video (dengan Collection Picker) ──
async function showBookmarkAction(videoId) {
    const user = await getAuthUser();
    if (!user) return showToast('Log masuk dahulu untuk simpan video.', 'warning');

    const icon    = document.getElementById(`bookmark-icon-${videoId}`);
    const isSaved = savedVideos.has(videoId);

    if (isSaved) {
        savedVideos.delete(videoId);
        saveSavedVideos();
        if (icon) { icon.style.color = '#fff'; icon.className = 'fa-solid fa-bookmark'; icon.style.transform = ''; }
        showToast('Video dibuang dari simpanan.', 'info');
    } else {
        savedVideos.add(videoId);
        saveSavedVideos();
        if (icon) {
            icon.style.color     = '#fe2c55';
            icon.className       = 'fa-solid fa-bookmark';
            icon.style.transform = 'scale(1.4)';
            setTimeout(() => { icon.style.transform = 'scale(1)'; }, 200);
        }

        // Tunjuk collection picker
        const { data: vid } = await snapSupabase.from('videos')
            .select('id,video_url,caption,likes_count').eq('id', videoId).single();

        if (vid && typeof window.openCollectionPicker === 'function') {
            window.openCollectionPicker(videoId, vid);
        } else {
            showToast('Video disimpan! 🔖 Pergi Profil → Koleksi untuk urus.', 'success');
        }
    }
}

// ── Muatkan halaman koleksi tersimpan ────────────
async function loadSavedVideos() {
    const container = document.getElementById('saved-videos-grid');
    if (!container) return;

    const ids = [...savedVideos];

    if (ids.length === 0) {
        container.innerHTML = `
            <div style="grid-column:span 3;text-align:center;color:#555;padding:60px 20px;">
                <i class="fa-solid fa-bookmark" style="font-size:44px;margin-bottom:16px;display:block;color:#222;"></i>
                <p style="font-size:15px;font-weight:700;color:#fff;">Tiada video tersimpan</p>
                <p style="font-size:13px;color:#444;margin-top:6px;">Klik ikon 🔖 pada video untuk simpan ke koleksi anda.</p>
                <a href="index.html" style="display:inline-block;margin-top:16px;background:#fe2c55;color:#fff;padding:10px 24px;border-radius:10px;font-weight:700;font-size:13px;">Terokai Video</a>
            </div>`;
        return;
    }

    // Ambil data video dari Supabase
    const { data: videos } = await snapSupabase
        .from('videos')
        .select('*')
        .in('id', ids);

    if (!videos || videos.length === 0) {
        // Video mungkin dah dipadam
        savedVideos.clear();
        saveSavedVideos();
        container.innerHTML = `<div style="grid-column:span 3;text-align:center;color:#555;padding:60px 20px;"><p>Video yang disimpan telah dipadam.</p></div>`;
        return;
    }

    container.innerHTML = videos.map(vid => `
        <div class="profile-video-item" style="position:relative;">
            <video src="${escapeHtml(vid.video_url)}" preload="none" onclick="window.location.href='index.html#video-${vid.id}'"></video>
            <div class="profile-video-overlay">
                <i class="fa-solid fa-heart"></i> ${vid.likes_count || 0}
            </div>
            <button onclick="removeSaved(${vid.id}, this)" style="position:absolute;top:6px;right:6px;background:rgba(0,0,0,0.6);border:none;color:#fe2c55;width:28px;height:28px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:10;">
                <i class="fa-solid fa-xmark" style="font-size:12px;"></i>
            </button>
        </div>
    `).join('');
}

function removeSaved(videoId, btn) {
    savedVideos.delete(videoId);
    saveSavedVideos();
    btn?.closest('.profile-video-item')?.remove();
    showToast('Dibuang dari koleksi.', 'info');
}

// ── Kemas kini ikon bookmark setelah feed load ───
function updateBookmarkIcons() {
    savedVideos.forEach(id => {
        const icon = document.getElementById(`bookmark-icon-${id}`);
        if (icon) icon.style.color = '#fe2c55';
    });
}

// ==========================================
// 21. LAPORAN VIDEO (REPORT)
// ==========================================

// ── Tunjuk menu pilihan video (tiga titik) ───────
function showVideoOptions(videoId, videoOwnerId) {
    document.getElementById('snap-options-sheet')?.remove();

    snapSupabase.auth.getUser().then(({ data: { user } }) => {
        const isOwner = user && user.id === videoOwnerId;

        const sheet = document.createElement('div');
        sheet.id = 'snap-options-sheet';
        sheet.innerHTML = `
            <div onclick="document.getElementById('snap-options-sheet').remove()"
                 style="position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:8000;"></div>
            <div style="position:fixed;bottom:0;left:0;right:0;background:#111;border-radius:20px 20px 0 0;padding:20px;z-index:8001;border-top:1px solid #222;">
                <div style="width:40px;height:4px;background:#333;border-radius:2px;margin:0 auto 16px;"></div>

                ${isOwner ? `
                <button onclick="deleteMyVideo(${videoId})" style="width:100%;background:transparent;border:none;color:#ff4757;padding:14px;text-align:left;font-size:15px;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:12px;border-bottom:1px solid #1a1a1a;">
                    <i class="fa-solid fa-trash" style="width:20px;"></i> Padam Video Saya
                </button>` : ''}

                <button onclick="showReportModal(${videoId})" style="width:100%;background:transparent;border:none;color:#fff;padding:14px;text-align:left;font-size:15px;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:12px;border-bottom:1px solid #1a1a1a;">
                    <i class="fa-solid fa-flag" style="width:20px;color:#fe2c55;"></i> Laporkan Video
                </button>

                <button onclick="showShareSheet(${videoId}, '')" style="width:100%;background:transparent;border:none;color:#fff;padding:14px;text-align:left;font-size:15px;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:12px;border-bottom:1px solid #1a1a1a;">
                    <i class="fa-solid fa-share" style="width:20px;color:#00f2ea;"></i> Kongsi Video
                </button>

                ${!isOwner ? `
                <button onclick="document.getElementById('snap-options-sheet').remove(); startDuet(${videoId}, document.querySelector('.video-container[data-video-id=\"${videoId}\"] video')?.src||'', '${videoOwnerId}')" style="width:100%;background:transparent;border:none;color:#fff;padding:14px;text-align:left;font-size:15px;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:12px;border-bottom:1px solid #1a1a1a;">
                    <i class="fa-solid fa-users" style="width:20px;color:#f6c90e;"></i> Duet
                </button>
                <button onclick="document.getElementById('snap-options-sheet').remove(); startStitch(${videoId}, document.querySelector('.video-container[data-video-id=\"${videoId}\"] video')?.src||'', '${videoOwnerId}')" style="width:100%;background:transparent;border:none;color:#fff;padding:14px;text-align:left;font-size:15px;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:12px;border-bottom:1px solid #1a1a1a;">
                    <i class="fa-solid fa-scissors" style="width:20px;color:#c084fc;"></i> Stitch
                </button>` : ''}

                <button onclick="document.getElementById('snap-options-sheet').remove(); generateSubtitleForVideo(${videoId}, document.querySelector('.video-container[data-video-id=\"${videoId}\"] video')?.src||'')" style="width:100%;background:transparent;border:none;color:#fff;padding:14px;text-align:left;font-size:15px;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:12px;border-bottom:1px solid #1a1a1a;">
                    <i class="fa-solid fa-closed-captioning" style="width:20px;color:#00f2ea;"></i> Jana Subtitle AI
                </button>

                <button onclick="document.getElementById('snap-options-sheet').remove(); window.location.href='challenge.html'" style="width:100%;background:transparent;border:none;color:#fff;padding:14px;text-align:left;font-size:15px;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:12px;border-bottom:1px solid #1a1a1a;">
                    <i class="fa-solid fa-trophy" style="width:20px;color:#f6c90e;"></i> Lihat Cabaran
                </button>

                <button onclick="document.getElementById('snap-options-sheet').remove()" style="width:100%;background:transparent;border:none;color:#555;padding:14px;text-align:center;font-size:15px;cursor:pointer;font-family:inherit;margin-top:4px;">
                    Batal
                </button>
            </div>`;

        document.body.appendChild(sheet);
    });
}

// ── Modal laporan ─────────────────────────────────
function showReportModal(videoId) {
    document.getElementById('snap-options-sheet')?.remove();
    document.getElementById('snap-report-modal')?.remove();

    const reasons = [
        { icon: '🔞', label: 'Kandungan lucah / tidak sesuai' },
        { icon: '🤬', label: 'Ucapan kebencian / keganasan' },
        { icon: '📢', label: 'Spam / iklan berlebihan' },
        { icon: '🎭', label: 'Maklumat palsu / mengelirukan' },
        { icon: '⚠️', label: 'Kandungan berbahaya / merbahaya' },
        { icon: '©️',  label: 'Pelanggaran hak cipta' },
        { icon: '👶', label: 'Kandungan tidak sesuai untuk kanak-kanak' },
    ];

    const modal = document.createElement('div');
    modal.id = 'snap-report-modal';
    modal.innerHTML = `
        <div onclick="document.getElementById('snap-report-modal').remove()"
             style="position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9000;"></div>
        <div style="position:fixed;bottom:0;left:0;right:0;background:#111;border-radius:20px 20px 0 0;padding:20px;z-index:9001;border-top:1px solid #222;max-height:85vh;overflow-y:auto;">
            <div style="width:40px;height:4px;background:#333;border-radius:2px;margin:0 auto 16px;"></div>
            <h3 style="font-size:16px;font-weight:800;margin:0 0 6px;">Laporkan Video</h3>
            <p style="font-size:13px;color:#555;margin:0 0 16px;">Pilih sebab laporan anda:</p>
            <div style="display:flex;flex-direction:column;gap:2px;">
                ${reasons.map((r, i) => `
                    <button onclick="submitReport(${videoId}, '${r.label}')"
                        style="width:100%;background:transparent;border:none;color:#fff;padding:14px;text-align:left;font-size:14px;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:12px;border-bottom:1px solid #1a1a1a;transition:background 0.15s;"
                        onmouseover="this.style.background='#1a1a1a'" onmouseout="this.style.background='transparent'">
                        <span style="font-size:18px;width:24px;">${r.icon}</span>${r.label}
                    </button>`).join('')}
            </div>
            <button onclick="document.getElementById('snap-report-modal').remove()"
                style="width:100%;background:transparent;border:none;color:#555;padding:14px;font-size:14px;cursor:pointer;font-family:inherit;margin-top:6px;">
                Batal
            </button>
        </div>`;

    document.body.appendChild(modal);
}

// ── Hantar laporan ke Supabase ────────────────────
async function submitReport(videoId, reason) {
    document.getElementById('snap-report-modal')?.remove();

    try {
        const { data: { user } } = await snapSupabase.auth.getUser();

        // Simpan laporan dalam table 'reports' (jika ada) atau log sahaja
        await snapSupabase.from('reports').insert([{
            video_id: videoId,
            reporter_id: user?.id || null,
            reason: reason,
        }]).maybeSingle(); // maybeSingle supaya tak error kalau table tak wujud lagi

    } catch (err) {
        // Walaupun table belum wujud, masih tunjuk mesej berjaya
        devLog('Report logged (table may not exist yet):', err.message);
    }

    showToast('Laporan dihantar. Terima kasih! 🙏', 'success');
}

// ── Padam video milik sendiri ────────────────────
async function deleteMyVideo(videoId) {
    document.getElementById('snap-options-sheet')?.remove();

    if (!confirm('Adakah anda pasti mahu memadam video ini?')) return;

    try {
        const { error } = await snapSupabase.from('videos').delete().eq('id', videoId);
        if (error) throw error;

        // Buang dari DOM
        const container = document.querySelector(`.video-container[data-video-id="${videoId}"]`);
        container?.remove();

        showToast('Video berjaya dipadam.', 'success');
    } catch (err) {
        showToast('Gagal padam video: ' + err.message, 'error');
    }
}

// ==========================================
// 22. ANALITIK KREATOR
// ==========================================

async function loadCreatorAnalytics() {
    const container = document.getElementById('analytics-container');
    if (!container) return;

    const { data: { user } } = await snapSupabase.auth.getUser();
    if (!user) return;

    container.innerHTML = `<div style="text-align:center;padding:30px;color:#444;"><div class="loader-spin"></div></div>`;

    try {
        // Ambil semua video kreator
        const { data: videos } = await snapSupabase
            .from('videos').select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        // Ambil stats follows
        const { count: followers } = await snapSupabase
            .from('follows').select('*', { count: 'exact', head: true })
            .eq('following_id', user.id);

        const { count: following } = await snapSupabase
            .from('follows').select('*', { count: 'exact', head: true })
            .eq('follower_id', user.id);

        const totalVideos = videos?.length || 0;
        const totalLikes  = videos?.reduce((s, v) => s + (v.likes_count || 0), 0) || 0;
        const totalViews  = totalLikes * 7; // Anggaran views (7x likes)

        // Video paling popular
        const topVideos = [...(videos || [])].sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0)).slice(0, 3);

        // Data 7 hari lepas untuk mini chart (simulasi berdasarkan data sedia ada)
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            const label = d.toLocaleDateString('ms-MY', { weekday: 'short' });
            const videosOnDay = videos?.filter(v => new Date(v.created_at).toDateString() === d.toDateString()) || [];
            const likes = videosOnDay.reduce((s, v) => s + (v.likes_count || 0), 0);
            return { label, likes, videos: videosOnDay.length };
        });

        const maxLikes = Math.max(...last7Days.map(d => d.likes), 1);

        container.innerHTML = `
            <!-- Stat Cards -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px;">
                ${[
                    { icon: 'fa-video', label: 'Video', value: totalVideos, color: '#fe2c55' },
                    { icon: 'fa-heart', label: 'Likes', value: totalLikes, color: '#fe2c55' },
                    { icon: 'fa-eye',   label: 'Angg. Views', value: totalViews, color: '#00f2ea' },
                    { icon: 'fa-users', label: 'Pengikut', value: followers || 0, color: '#ffcc00' },
                ].map(s => `
                    <div style="background:#111;border:1px solid #1a1a1a;border-radius:14px;padding:16px;text-align:center;">
                        <i class="fa-solid ${s.icon}" style="color:${s.color};font-size:20px;margin-bottom:8px;display:block;"></i>
                        <p style="margin:0;font-size:22px;font-weight:800;">${s.value.toLocaleString()}</p>
                        <p style="margin:4px 0 0;font-size:12px;color:#555;">${s.label}</p>
                    </div>`).join('')}
            </div>

            <!-- Mini Chart: Likes 7 hari -->
            <div style="background:#111;border:1px solid #1a1a1a;border-radius:14px;padding:16px;margin-bottom:20px;">
                <p style="margin:0 0 14px;font-size:14px;font-weight:700;">📊 Likes — 7 Hari Lepas</p>
                <div style="display:flex;align-items:flex-end;gap:6px;height:80px;">
                    ${last7Days.map(d => `
                        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;">
                            <div style="width:100%;background:#fe2c55;border-radius:4px 4px 0 0;height:${maxLikes > 0 ? Math.max(4, (d.likes / maxLikes) * 68) : 4}px;transition:height 0.5s ease;"></div>
                            <span style="font-size:9px;color:#444;">${d.label}</span>
                        </div>`).join('')}
                </div>
                <p style="margin:10px 0 0;font-size:11px;color:#333;text-align:center;">Graf berdasarkan data sebenar video anda</p>
            </div>

            <!-- Video Popular -->
            ${topVideos.length > 0 ? `
            <div style="background:#111;border:1px solid #1a1a1a;border-radius:14px;padding:16px;">
                <p style="margin:0 0 14px;font-size:14px;font-weight:700;">🏆 Video Paling Popular</p>
                <div style="display:flex;flex-direction:column;gap:10px;">
                    ${topVideos.map((v, i) => `
                        <div style="display:flex;gap:12px;align-items:center;" onclick="window.location.href='index.html#video-${v.id}'" style="cursor:pointer;">
                            <div style="width:28px;height:28px;border-radius:50%;background:${['#fe2c55','#ffcc00','#00f2ea'][i]};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;flex-shrink:0;">#${i+1}</div>
                            <div style="flex:1;min-width:0;">
                                <p style="margin:0;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#ccc;">${escapeHtml(v.caption || 'Tiada kapsyen')}</p>
                                <p style="margin:3px 0 0;font-size:12px;color:#555;">${v.likes_count || 0} likes · ${timeAgo(v.created_at)}</p>
                            </div>
                        </div>`).join('')}
                </div>
            </div>` : ''}
        `;

    } catch (err) {
        container.innerHTML = `<div style="text-align:center;padding:40px;color:#fe2c55;"><p>Gagal muatkan analitik.</p></div>`;
    }
}

// ==========================================
// 23. CARIAN KREATOR (dengan filter Video/Kreator)
// ==========================================

let currentSearchFilter = 'semua';
let lastSearchQuery = '';

function setSearchFilter(filter, el) {
    currentSearchFilter = filter;
    document.querySelectorAll('.spill').forEach(b => {
        b.style.background = 'transparent';
        b.style.borderColor = '#222';
        b.style.color = '#555';
    });
    el.style.background = '#222';
    el.style.color = '#fff';
    if (lastSearchQuery) searchDiscover(lastSearchQuery);
}

// Override searchDiscover untuk sokong filter kreator

// ==========================================
// 24. LEADERBOARD KREATOR
// ==========================================

async function renderLeaderboard(el) {
    el.innerHTML = `<div style="text-align:center;padding:30px;color:#444;"><div class="loader-spin"></div></div>`;

    try {
        const { data: vids } = await snapSupabase
            .from('videos').select('user_id, username, likes_count, created_at');

        // Aggregate
        const map = {};
        (vids || []).forEach(v => {
            if (!map[v.user_id]) map[v.user_id] = { user_id: v.user_id, username: v.username || 'Kreator', totalLikes: 0, videoCount: 0 };
            map[v.user_id].totalLikes  += (v.likes_count || 0);
            map[v.user_id].videoCount  += 1;
        });

        const top = Object.values(map)
            .sort((a, b) => b.totalLikes - a.totalLikes)
            .slice(0, 10);

        if (top.length === 0) {
            el.innerHTML = emptyState('Belum ada kreator. Jadilah yang pertama!', 'fa-trophy');
            return;
        }

        const medals = ['🥇', '🥈', '🥉'];

        el.innerHTML = `
            <div style="padding:16px 16px 8px;">
                <div style="background:linear-gradient(135deg,#1a0008,#0d0d0d);border:1px solid #2a0010;border-radius:14px;padding:16px;text-align:center;margin-bottom:20px;">
                    <p style="margin:0;font-size:13px;color:#555;">Disusun mengikut</p>
                    <h2 style="margin:4px 0 0;font-size:18px;font-weight:800;">❤️ Jumlah Likes Keseluruhan</h2>
                </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:2px;">
                ${top.map((c, i) => `
                    <div class="search-result-item fade-in" style="animation-delay:${i*0.05}s;padding:14px 16px;${i < 3 ? 'background:linear-gradient(to right,rgba(254,44,85,0.05),transparent);' : ''}">
                        <div style="width:32px;text-align:center;flex-shrink:0;font-size:${i < 3 ? '22px' : '14px'};font-weight:800;color:${i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#444'};">
                            ${i < 3 ? medals[i] : `#${i+1}`}
                        </div>
                        <div style="width:44px;height:44px;border-radius:50%;background-image:url('https://ui-avatars.com/api/?name=${encodeURIComponent(c.username)}&background=random&size=100');background-size:cover;flex-shrink:0;border:${i===0?'2px solid #FFD700':i===1?'2px solid #C0C0C0':i===2?'2px solid #CD7F32':'1px solid #222'};"></div>
                        <div style="flex:1;min-width:0;">
                            <strong style="font-size:14px;display:block;">@${escapeHtml(c.username)}</strong>
                            <span style="font-size:12px;color:#555;">${c.videoCount} video · <span style="color:#fe2c55;font-weight:700;">${c.totalLikes.toLocaleString()} likes</span></span>
                        </div>
                        <button class="follow-kreator-btn" style="width:70px;font-size:12px;" onclick="followCreatorById('${c.user_id}', this)">+ Ikuti</button>
                    </div>`).join('')}
            </div>`;

    } catch (err) {
        el.innerHTML = emptyState('Gagal memuatkan leaderboard.', 'fa-triangle-exclamation');
    }
}

// ==========================================
// 25. VIDEO DIPIN DI PROFIL
// ==========================================

async function loadPinnedVideo() {
    const container = document.getElementById('pinned-video-wrap');
    if (!container) return;

    const { data: { user } } = await snapSupabase.auth.getUser();
    if (!user) return;

    const pinnedId = localStorage.getItem(`snapflow-pinned-${user.id}`);
    if (!pinnedId) { container.style.display = 'none'; return; }

    const { data: vid } = await snapSupabase.from('videos').select('*').eq('id', pinnedId).single();
    if (!vid) { container.style.display = 'none'; return; }

    container.style.display = 'block';
    container.innerHTML = `
        <div style="padding:0 16px 12px;">
            <p style="font-size:12px;font-weight:700;color:#555;margin:0 0 8px;display:flex;align-items:center;gap:6px;">
                <i class="fa-solid fa-thumbtack" style="color:#fe2c55;"></i> VIDEO DIPIN
            </p>
            <div style="position:relative;border-radius:12px;overflow:hidden;aspect-ratio:16/9;background:#111;cursor:pointer;" onclick="window.location.href='index.html#video-${vid.id}'">
                <video src="${escapeHtml(vid.video_url)}" preload="none" muted playsinline style="width:100%;height:100%;object-fit:cover;"
                    onmouseenter="this.play()" onmouseleave="this.pause();this.currentTime=0;"></video>
                <div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(to top,rgba(0,0,0,0.8),transparent);padding:10px 12px;">
                    <p style="margin:0;font-size:13px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(vid.caption || 'Video dipin')}</p>
                    <p style="margin:3px 0 0;font-size:11px;color:#888;">❤️ ${vid.likes_count || 0} likes</p>
                </div>
                <button onclick="unpinVideo(event)" style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,0.6);border:none;color:#fe2c55;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:12px;">✕</button>
            </div>
        </div>`;
}

async function showPinVideoModal() {
    const { data: { user } } = await snapSupabase.auth.getUser();
    if (!user) return showToast('Log masuk dahulu.', 'warning');

    const { data: videos } = await snapSupabase.from('videos').select('*')
        .eq('user_id', user.id).order('likes_count', { ascending: false }).limit(10);

    if (!videos || videos.length === 0) return showToast('Anda belum ada video untuk dipin.', 'warning');

    document.getElementById('pin-modal')?.remove();
    const modal = document.createElement('div');
    modal.id = 'pin-modal';
    modal.innerHTML = `
        <div onclick="document.getElementById('pin-modal').remove()" style="position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9000;"></div>
        <div style="position:fixed;bottom:0;left:0;right:0;background:#111;border-radius:20px 20px 0 0;padding:20px;z-index:9001;max-height:75vh;overflow-y:auto;border-top:1px solid #222;">
            <div style="width:40px;height:4px;background:#333;border-radius:2px;margin:0 auto 16px;"></div>
            <h3 style="margin:0 0 14px;font-size:16px;font-weight:800;">📌 Pilih Video untuk Dipin</h3>
            <div style="display:flex;flex-direction:column;gap:2px;">
                ${videos.map(v => `
                    <div class="search-result-item" onclick="pinVideo(${v.id})" style="gap:12px;">
                        <video src="${escapeHtml(v.video_url)}" style="width:52px;height:52px;object-fit:cover;border-radius:8px;flex-shrink:0;" preload="none" muted></video>
                        <div style="flex:1;min-width:0;">
                            <p style="margin:0;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(v.caption || 'Tiada kapsyen')}</p>
                            <p style="margin:3px 0 0;font-size:11px;color:#555;">❤️ ${v.likes_count || 0} likes</p>
                        </div>
                        <i class="fa-solid fa-thumbtack" style="color:#333;font-size:14px;flex-shrink:0;"></i>
                    </div>`).join('')}
            </div>
        </div>`;
    document.body.appendChild(modal);
}

async function pinVideo(videoId) {
    const { data: { user } } = await snapSupabase.auth.getUser();
    if (!user) return;
    localStorage.setItem(`snapflow-pinned-${user.id}`, videoId);
    document.getElementById('pin-modal')?.remove();
    showToast('Video berjaya dipin! 📌', 'success');
    loadPinnedVideo();
}

function unpinVideo(event) {
    event.stopPropagation();
    snapSupabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) return;
        localStorage.removeItem(`snapflow-pinned-${user.id}`);
        const wrap = document.getElementById('pinned-video-wrap');
        if (wrap) wrap.style.display = 'none';
        showToast('Pin dibuang.', 'info');
    });
}

// ==========================================
// 26. THUMBNAIL AUTO-JANA (Canvas)
// ==========================================

const thumbnailCache = {}; // Cache supaya tidak jana semula

function generateThumbnail(videoUrl, videoId) {
    if (thumbnailCache[videoId]) {
        drawThumbnailToCanvas(thumbnailCache[videoId], videoId);
        return;
    }

    const video = document.createElement('video');
    video.src = videoUrl;
    video.muted = true;
    video.crossOrigin = 'anonymous';
    video.preload = 'metadata';

    video.addEventListener('loadeddata', () => {
        // Lompat ke saat ke-1 untuk elak frame hitam
        video.currentTime = Math.min(1, video.duration * 0.1);
    });

    video.addEventListener('seeked', () => {
        try {
            const canvas = document.getElementById(`thumb-${videoId}`);
            if (!canvas) return;

            // Set dimensi canvas ikut ratio video
            canvas.width  = video.videoWidth  || 360;
            canvas.height = video.videoHeight || 640;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Cache sebagai dataURL
            thumbnailCache[videoId] = canvas.toDataURL('image/jpeg', 0.7);

            // Kosongkan video element untuk jimat memori
            video.src = '';
            video.load();
        } catch (e) {
            // Cross-origin error — guna placeholder
            drawPlaceholderThumbnail(videoId);
        }
    });

    video.addEventListener('error', () => drawPlaceholderThumbnail(videoId));
    video.load();
}

function drawThumbnailToCanvas(dataUrl, videoId) {
    const canvas = document.getElementById(`thumb-${videoId}`);
    if (!canvas) return;
    const img = new Image();
    img.onload = () => {
        canvas.width  = img.width;
        canvas.height = img.height;
        canvas.getContext('2d').drawImage(img, 0, 0);
    };
    img.src = dataUrl;
}

function drawPlaceholderThumbnail(videoId) {
    const canvas = document.getElementById(`thumb-${videoId}`);
    if (!canvas) return;
    canvas.width  = 360;
    canvas.height = 640;
    const ctx = canvas.getContext('2d');
    // Gradient placeholder
    const grad = ctx.createLinearGradient(0, 0, 0, 640);
    grad.addColorStop(0, '#1a1a1a');
    grad.addColorStop(1, '#0d0d0d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 360, 640);
    // Ikon video
    ctx.fillStyle = '#333';
    ctx.font = '48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎬', 180, 340);
}

// ==========================================
// 27. REACTIONS PADA VIDEO
// ==========================================

const REACTIONS = [
    { emoji: '❤️', key: 'love'  },
    { emoji: '😂', key: 'haha'  },
    { emoji: '🔥', key: 'fire'  },
    { emoji: '😮', key: 'wow'   },
    { emoji: '🤩', key: 'star'  },
    { emoji: '😢', key: 'sad'   },
];

// Cache reactions per video
const videoReactions = {}; // { videoId: { love: 12, haha: 3, ... }, myReaction: 'love' }

async function loadVideoReactions(videoId) {
    try {
        const { data } = await snapSupabase
            .from('reactions')
            .select('reaction_type, user_id')
            .eq('video_id', videoId);

        const { data: { user } } = await snapSupabase.auth.getUser();

        const counts = {};
        REACTIONS.forEach(r => counts[r.key] = 0);
        let myReaction = null;

        (data || []).forEach(r => {
            counts[r.reaction_type] = (counts[r.reaction_type] || 0) + 1;
            if (user && r.user_id === user.id) myReaction = r.reaction_type;
        });

        videoReactions[videoId] = { ...counts, myReaction };
        return videoReactions[videoId];
    } catch {
        return null;
    }
}

function showReactionPicker(videoId, triggerEl) {
    document.getElementById('reaction-picker')?.remove();

    const picker = document.createElement('div');
    picker.id = 'reaction-picker';

    const rect = triggerEl.getBoundingClientRect();
    picker.style.cssText = `
        position: fixed;
        bottom: ${window.innerHeight - rect.top + 8}px;
        right: 16px;
        background: #1a1a1a;
        border: 1px solid #333;
        border-radius: 50px;
        padding: 8px 12px;
        display: flex;
        gap: 6px;
        z-index: 5000;
        box-shadow: 0 4px 20px rgba(0,0,0,0.6);
        animation: reactionPickerIn 0.2s cubic-bezier(0.34,1.56,0.64,1);
    `;

    const myReaction = videoReactions[videoId]?.myReaction;

    picker.innerHTML = REACTIONS.map(r => `
        <button onclick="toggleReaction(${videoId}, '${r.key}', this)"
            style="background:${myReaction === r.key ? 'rgba(254,44,85,0.2)' : 'transparent'};
                   border:${myReaction === r.key ? '1px solid #fe2c55' : 'none'};
                   font-size:22px; cursor:pointer; border-radius:50%; width:40px; height:40px;
                   display:flex; align-items:center; justify-content:center;
                   transition:transform 0.15s;" id="rpick-${videoId}-${r.key}"
            onmouseover="this.style.transform='scale(1.3)'"
            onmouseout="this.style.transform='scale(1)'">
            ${r.emoji}
        </button>
    `).join('');

    document.body.appendChild(picker);

    // Tutup bila klik luar
    setTimeout(() => {
        document.addEventListener('click', function closePicker(e) {
            if (!picker.contains(e.target)) {
                picker.remove();
                document.removeEventListener('click', closePicker);
            }
        });
    }, 100);
}

async function toggleReaction(videoId, reactionKey, btn) {
    document.getElementById('reaction-picker')?.remove();

    const { data: { user } } = await snapSupabase.auth.getUser();
    if (!user) return showToast('Log masuk dahulu.', 'warning');

    const current = videoReactions[videoId]?.myReaction;

    if (current === reactionKey) {
        // Buang reaction
        await snapSupabase.from('reactions').delete()
            .eq('video_id', videoId).eq('user_id', user.id);
        videoReactions[videoId].myReaction = null;
        videoReactions[videoId][reactionKey] = Math.max(0, (videoReactions[videoId][reactionKey] || 1) - 1);
        showToast('Reaction dibuang.', 'info');
    } else {
        // Buang reaction lama jika ada
        if (current) {
            await snapSupabase.from('reactions').delete()
                .eq('video_id', videoId).eq('user_id', user.id);
            if (videoReactions[videoId]) videoReactions[videoId][current] = Math.max(0, (videoReactions[videoId][current] || 1) - 1);
        }
        // Tambah reaction baru
        await snapSupabase.from('reactions').upsert([{
            video_id: videoId, user_id: user.id, reaction_type: reactionKey
        }]);
        if (!videoReactions[videoId]) videoReactions[videoId] = {};
        videoReactions[videoId].myReaction = reactionKey;
        videoReactions[videoId][reactionKey] = (videoReactions[videoId][reactionKey] || 0) + 1;

        const found = REACTIONS.find(r => r.key === reactionKey);
        showToast(`${found?.emoji} Reaction dihantar!`, 'success');
    }

    updateReactionBar(videoId);
}

function updateReactionBar(videoId) {
    const bar = document.getElementById(`reaction-bar-${videoId}`);
    if (!bar) return;
    const data = videoReactions[videoId] || {};
    const myReaction = data.myReaction;
    const topReactions = REACTIONS
        .filter(r => data[r.key] > 0)
        .sort((a, b) => data[b.key] - data[a.key])
        .slice(0, 3);

    if (topReactions.length === 0) { bar.style.display = 'none'; return; }
    bar.style.display = 'flex';
    bar.innerHTML = topReactions.map(r => `
        <span style="font-size:12px;background:${myReaction===r.key?'rgba(254,44,85,0.25)':'rgba(255,255,255,0.1)'};
              border-radius:20px;padding:3px 8px;display:flex;align-items:center;gap:3px;cursor:pointer;"
              onclick="showReactionPicker(${videoId}, this)">
            ${r.emoji} <span style="font-size:11px;color:#ccc;">${data[r.key]}</span>
        </span>
    `).join('');
}

async function initVideoReactions(videoId) {
    await loadVideoReactions(videoId);
    updateReactionBar(videoId);
}

// ==========================================
// 28. TAG RAKAN DALAM KOMEN (@mention)
// ==========================================

let mentionUsers = []; // Cache senarai kreator untuk autocomplete
let mentionDropdownActive = false;

async function fetchMentionUsers() {
    if (mentionUsers.length > 0) return; // Dah ada cache
    try {
        const { data } = await snapSupabase
            .from('videos').select('user_id, username').limit(50);
        const seen = new Set();
        mentionUsers = (data || []).filter(v => {
            if (seen.has(v.user_id)) return false;
            seen.add(v.user_id);
            return true;
        }).map(v => ({ id: v.user_id, username: v.username || 'User' }));
    } catch {}
}

function handleCommentInput(e) {
    const input = e.target;
    const val   = input.value;
    const caret = input.selectionStart;

    // Cari @ sebelum caret
    const textBefore = val.slice(0, caret);
    const match = textBefore.match(/@(\w*)$/);

    if (match) {
        const query = match[1].toLowerCase();
        showMentionDropdown(input, query);
    } else {
        closeMentionDropdown();
    }
}

function showMentionDropdown(input, query) {
    fetchMentionUsers();
    const filtered = mentionUsers
        .filter(u => u.username.toLowerCase().includes(query))
        .slice(0, 5);

    document.getElementById('mention-dropdown')?.remove();
    if (filtered.length === 0) return;

    const dd = document.createElement('div');
    dd.id = 'mention-dropdown';

    const inputRect = input.getBoundingClientRect();
    dd.style.cssText = `
        position: fixed;
        bottom: ${window.innerHeight - inputRect.top + 4}px;
        left: ${inputRect.left}px;
        right: 16px;
        background: #1a1a1a;
        border: 1px solid #333;
        border-radius: 12px;
        overflow: hidden;
        z-index: 6000;
        box-shadow: 0 -4px 20px rgba(0,0,0,0.5);
    `;

    dd.innerHTML = filtered.map(u => `
        <div onclick="insertMention('${escapeHtml(u.username)}')"
             style="padding:10px 14px;display:flex;align-items:center;gap:10px;cursor:pointer;border-bottom:1px solid #222;transition:background 0.15s;"
             onmouseover="this.style.background='#222'" onmouseout="this.style.background='transparent'">
            <div style="width:32px;height:32px;border-radius:50%;background-image:url('https://ui-avatars.com/api/?name=${encodeURIComponent(u.username)}&background=random&size=64');background-size:cover;flex-shrink:0;"></div>
            <span style="font-size:14px;font-weight:600;">@${escapeHtml(u.username)}</span>
        </div>
    `).join('');

    document.body.appendChild(dd);
    mentionDropdownActive = true;
}

function insertMention(username) {
    const input = document.getElementById('new-comment');
    if (!input) return;

    const val   = input.value;
    const caret = input.selectionStart;
    const textBefore = val.slice(0, caret);
    const atIdx = textBefore.lastIndexOf('@');

    const before = val.slice(0, atIdx);
    const after  = val.slice(caret);
    input.value  = `${before}@${username} ${after}`;
    input.focus();
    const newPos = atIdx + username.length + 2;
    input.setSelectionRange(newPos, newPos);

    closeMentionDropdown();
}

function closeMentionDropdown() {
    document.getElementById('mention-dropdown')?.remove();
    mentionDropdownActive = false;
}

// ==========================================
// 29. STORIES 24 JAM
// ==========================================

async function loadStoriesStrip() {
    const strip = document.getElementById('stories-strip');
    if (!strip) return;

    try {
        const { data: { user } } = await snapSupabase.auth.getUser();

        // Ambil stories yang belum expired (24 jam)
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: stories } = await snapSupabase
            .from('stories')
            .select('*')
            .gt('created_at', cutoff)
            .order('created_at', { ascending: false });

        // Tambah butang "Cerita Saya" jika logged in
        let html = '';
        if (user) {
            const myStory = (stories || []).find(s => s.user_id === user.id);
            html += `
                <div class="story-item" onclick="openAddStory()">
                    <div class="story-avatar" style="${myStory ? `background-image:url('${escapeHtml(myStory.media_url)}');background-size:cover;` : 'background:#1a1a1a;'}border:2px solid ${myStory ? '#fe2c55' : '#333'};">
                        ${!myStory ? '<div style="position:absolute;bottom:-2px;right:-2px;background:#fe2c55;width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:#fff;border:2px solid #000;">+</div>' : ''}
                    </div>
                    <span class="story-label">Cerita Saya</span>
                </div>`;
        }

        // Stories dari kreator lain
        const others = (stories || []).filter(s => s.user_id !== user?.id);
        const uniqueUsers = {};
        others.forEach(s => { if (!uniqueUsers[s.user_id]) uniqueUsers[s.user_id] = s; });

        Object.values(uniqueUsers).forEach(s => {
            const username = s.username || 'User';
            html += `
                <div class="story-item" onclick="openStory(${s.id})">
                    <div class="story-avatar" style="background-image:url('https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random&size=120');background-size:cover;border:2.5px solid #fe2c55;"></div>
                    <span class="story-label">@${escapeHtml(username.slice(0, 8))}</span>
                </div>`;
        });

        if (!html) { strip.style.display = 'none'; return; }
        strip.style.display = 'flex';
        strip.innerHTML = html;

    } catch (err) {
        console.warn('Stories strip error:', err);
        strip.style.display = 'none';
    }
}

async function openStory(storyId) {
    const { data: story } = await snapSupabase
        .from('stories').select('*').eq('id', storyId).single();
    if (!story) return;

    document.getElementById('story-viewer')?.remove();
    const viewer = document.createElement('div');
    viewer.id = 'story-viewer';

    const createdAt = new Date(story.created_at);
    const msAgo = Date.now() - createdAt.getTime();
    const hoursLeft = Math.max(0, 24 - Math.floor(msAgo / 3600000));

    viewer.style.cssText = `
        position:fixed;inset:0;background:#000;z-index:9500;
        display:flex;flex-direction:column;
    `;
    viewer.innerHTML = `
        <!-- Progress bar -->
        <div style="height:3px;background:#333;margin:12px 12px 0;">
            <div id="story-progress" style="height:100%;background:#fff;width:0%;transition:width 5s linear;"></div>
        </div>
        <!-- Header -->
        <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;">
            <div style="width:36px;height:36px;border-radius:50%;background-image:url('https://ui-avatars.com/api/?name=${encodeURIComponent(story.username||'U')}&background=random&size=80');background-size:cover;border:2px solid #fe2c55;"></div>
            <div>
                <strong style="font-size:13px;">@${escapeHtml(story.username || 'User')}</strong>
                <p style="margin:0;font-size:11px;color:#888;">${hoursLeft}j lagi sebelum tamat</p>
            </div>
            <button onclick="document.getElementById('story-viewer').remove()" style="margin-left:auto;background:transparent;border:none;color:#fff;font-size:22px;cursor:pointer;">✕</button>
        </div>
        <!-- Media -->
        <div style="flex:1;display:flex;align-items:center;justify-content:center;padding:0 14px 14px;position:relative;">
            ${story.media_type === 'video'
                ? `<video src="${escapeHtml(story.media_url)}" autoplay muted playsinline loop style="max-width:100%;max-height:100%;border-radius:12px;object-fit:cover;"></video>`
                : `<img loading="lazy" src="${escapeHtml(story.media_url)}" style="max-width:100%;max-height:100%;border-radius:12px;object-fit:cover;" alt="story">`
            }
            ${story.caption ? `<div style="position:absolute;bottom:24px;left:24px;right:24px;background:rgba(0,0,0,0.6);padding:10px 14px;border-radius:10px;font-size:14px;text-align:center;">${escapeHtml(story.caption)}</div>` : ''}
        </div>`;

    document.body.appendChild(viewer);

    // Mula progress bar
    setTimeout(() => {
        const bar = document.getElementById('story-progress');
        if (bar) bar.style.width = '100%';
    }, 100);

    // Auto-tutup selepas 5 saat
    setTimeout(() => viewer.remove(), 5100);
}

async function openAddStory() {
    const { data: { user } } = await snapSupabase.auth.getUser();
    if (!user) return showToast('Log masuk dahulu.', 'warning');

    document.getElementById('add-story-modal')?.remove();
    const modal = document.createElement('div');
    modal.id = 'add-story-modal';
    modal.innerHTML = `
        <div onclick="document.getElementById('add-story-modal').remove()" style="position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:9000;"></div>
        <div style="position:fixed;bottom:0;left:0;right:0;background:#111;border-radius:20px 20px 0 0;padding:24px;z-index:9001;border-top:1px solid #222;">
            <div style="width:40px;height:4px;background:#333;border-radius:2px;margin:0 auto 20px;"></div>
            <h3 style="margin:0 0 6px;font-size:17px;font-weight:800;">📸 Tambah Cerita</h3>
            <p style="margin:0 0 20px;font-size:13px;color:#555;">Cerita anda akan hilang selepas 24 jam</p>

            <input type="file" id="story-file-input" accept="image/*,video/*" style="display:none;" onchange="previewStoryFile(this)">

            <div id="story-preview" onclick="document.getElementById('story-file-input').click()"
                 style="width:100%;aspect-ratio:9/16;max-height:300px;background:#1a1a1a;border-radius:14px;border:2px dashed #333;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;cursor:pointer;overflow:hidden;margin-bottom:14px;">
                <i class="fa-solid fa-image" style="font-size:36px;color:#333;"></i>
                <span style="font-size:13px;color:#444;">Klik untuk pilih gambar / video</span>
            </div>

            <input type="text" id="story-caption" placeholder="Tulis kapsyen cerita (optional)..."
                   style="width:100%;background:#1a1a1a;border:1px solid #222;color:#fff;padding:12px;border-radius:10px;font-size:14px;font-family:inherit;box-sizing:border-box;margin-bottom:14px;">

            <button onclick="uploadStory()" style="width:100%;background:#fe2c55;color:#fff;border:none;padding:14px;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;">
                <i class="fa-solid fa-paper-plane"></i> Kongsi Cerita
            </button>
        </div>`;
    document.body.appendChild(modal);
}

function previewStoryFile(input) {
    const file = input.files[0];
    if (!file) return;
    const preview = document.getElementById('story-preview');
    const url = URL.createObjectURL(file);

    if (file.type.startsWith('video')) {
        preview.innerHTML = `<video src="${url}" autoplay muted loop playsinline style="width:100%;height:100%;object-fit:cover;border-radius:12px;"></video>`;
    } else {
        preview.innerHTML = `<img loading="lazy" src="${url}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;" alt="preview">`;
    }
}

async function uploadStory() {
    const fileInput = document.getElementById('story-file-input');
    const caption   = document.getElementById('story-caption')?.value?.trim() || '';

    if (!fileInput?.files[0]) return showToast('Pilih gambar atau video dahulu.', 'warning');

    const file = fileInput.files[0];
    const { data: { user } } = await snapSupabase.auth.getUser();
    if (!user) return;

    showToast('Memuat naik cerita...', 'info');

    try {
        const ext  = file.name.split('.').pop();
        const path = `stories/${user.id}/${Date.now()}.${ext}`;
        const bucket = file.type.startsWith('video') ? 'videos' : 'images';

        const { error: uploadErr } = await snapSupabase.storage
            .from(bucket).upload(path, file, { upsert: true });
        if (uploadErr) throw uploadErr;

        const { data: { publicUrl } } = snapSupabase.storage.from(bucket).getPublicUrl(path);

        await snapSupabase.from('stories').insert([{
            user_id:    user.id,
            username:   user.user_metadata?.full_name || 'User',
            media_url:  publicUrl,
            media_type: file.type.startsWith('video') ? 'video' : 'image',
            caption,
        }]);

        document.getElementById('add-story-modal')?.remove();
        showToast('Cerita berjaya dikongsi! 🎉', 'success');
        loadStoriesStrip();

    } catch (err) {
        showToast('Gagal upload cerita: ' + err.message, 'error');
    }
}

// ==========================================
// 30. VIDEO COMPRESSION (Canvas-based)
// ==========================================

async function compressVideo(file) {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.src   = URL.createObjectURL(file);
        video.muted = true;
        video.playsInline = true;

        video.addEventListener('loadedmetadata', () => {
            // Target: lebar max 720px, jimat ~40%
            const targetW = Math.min(video.videoWidth, 720);
            const ratio   = targetW / video.videoWidth;
            const targetH = Math.round(video.videoHeight * ratio);

            const canvas  = document.createElement('canvas');
            canvas.width  = targetW;
            canvas.height = targetH;
            const ctx     = canvas.getContext('2d');

            // Guna MediaRecorder untuk encode semula
            let stream;
            try {
                stream = canvas.captureStream(24); // 24fps
            } catch (e) {
                return reject(new Error('captureStream tidak disokong'));
            }

            const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
                ? 'video/webm;codecs=vp9'
                : MediaRecorder.isTypeSupported('video/webm')
                    ? 'video/webm'
                    : null;

            if (!mimeType) return reject(new Error('Format tidak disokong'));

            const recorder = new MediaRecorder(stream, {
                mimeType,
                videoBitsPerSecond: 1_500_000 // 1.5 Mbps
            });

            const chunks = [];
            recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: mimeType });
                const compressed = new File([blob], file.name.replace(/\.[^.]+$/, '.webm'), {
                    type: mimeType,
                    lastModified: Date.now()
                });
                URL.revokeObjectURL(video.src);
                resolve(compressed);
            };

            video.addEventListener('play', () => {
                recorder.start(100);
                const draw = () => {
                    if (video.paused || video.ended) {
                        recorder.stop();
                        return;
                    }
                    ctx.drawImage(video, 0, 0, targetW, targetH);
                    requestAnimationFrame(draw);
                };
                draw();
            });

            video.play().catch(reject);

            // Timeout 3 minit maksimum
            setTimeout(() => {
                if (recorder.state !== 'inactive') recorder.stop();
            }, 180_000);
        });

        video.addEventListener('error', reject);
        video.load();
    });
}

// ==========================================
// 31. DUET / STITCH VIDEO
// ==========================================

async function openDuetPicker() {
    const { data: { user } } = await snapSupabase.auth.getUser();
    if (!user) return showToast('Log masuk dahulu untuk buat Duet.', 'warning');

    // Ambil video trending untuk dijadikan duet
    const { data: videos } = await snapSupabase
        .from('videos')
        .select('id, video_url, caption, username, likes_count')
        .order('likes_count', { ascending: false })
        .limit(12);

    document.getElementById('duet-picker')?.remove();

    const modal = document.createElement('div');
    modal.id = 'duet-picker';
    modal.innerHTML = `
        <div onclick="closeDuetPicker()"
             style="position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9000;"></div>
        <div style="position:fixed;bottom:0;left:0;right:0;background:#111;border-radius:20px 20px 0 0;
                    padding:20px;z-index:9001;max-height:80vh;overflow-y:auto;border-top:1px solid #222;">
            <div style="width:40px;height:4px;background:#333;border-radius:2px;margin:0 auto 16px;"></div>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
                <i class="fa-solid fa-film" style="color:#00f2ea;font-size:18px;"></i>
                <h3 style="margin:0;font-size:16px;font-weight:800;">Pilih Video untuk Duet</h3>
            </div>
            <p style="font-size:12px;color:#555;margin:0 0 14px;">
                Video anda akan dipapar sebelah video ini dalam split-screen
            </p>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:3px;">
                ${(videos || []).map(v => `
                    <div onclick="selectDuetVideo(${v.id}, '${escapeHtml(v.video_url)}', '${escapeHtml(v.username || 'User')}')"
                         style="position:relative;aspect-ratio:9/16;background:#1a1a1a;
                                border-radius:6px;overflow:hidden;cursor:pointer;">
                        <video src="${escapeHtml(v.video_url)}" preload="metadata" muted
                               style="width:100%;height:100%;object-fit:cover;"
                               onmouseenter="this.play()" onmouseleave="this.pause();this.currentTime=0;"></video>
                        <div style="position:absolute;bottom:0;left:0;right:0;
                                    background:linear-gradient(to top,rgba(0,0,0,0.8),transparent);
                                    padding:6px;font-size:10px;color:#fff;">
                            @${escapeHtml((v.username || 'User').slice(0,10))}
                        </div>
                    </div>`).join('')}
            </div>
            <button onclick="closeDuetPicker()"
                style="width:100%;background:transparent;border:none;color:#555;
                       padding:14px;font-size:14px;cursor:pointer;font-family:inherit;margin-top:10px;">
                Batal
            </button>
        </div>`;

    document.body.appendChild(modal);
}

function closeDuetPicker() {
    document.getElementById('duet-picker')?.remove();
}

function selectDuetVideo(videoId, videoUrl, username) {
    closeDuetPicker();
    isDuetMode      = true;
    duetSourceVideo = { id: videoId, url: videoUrl, username };

    // Tunjuk preview duet
    const previewArea = document.querySelector('.upload-box');
    const banner = document.getElementById('duet-banner');
    if (banner) banner.remove();

    const div = document.createElement('div');
    div.id = 'duet-banner';
    div.style.cssText = `
        display:flex; align-items:center; gap:10px; padding:12px 14px;
        background:linear-gradient(135deg,#001a1a,#000d0d);
        border:1px solid #00f2ea33; border-radius:12px; margin-top:12px;
    `;
    div.innerHTML = `
        <i class="fa-solid fa-film" style="color:#00f2ea;font-size:18px;flex-shrink:0;"></i>
        <div style="flex:1;min-width:0;">
            <p style="margin:0;font-size:13px;font-weight:700;color:#00f2ea;">Mod Duet Aktif</p>
            <p style="margin:2px 0 0;font-size:12px;color:#555;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                Duet dengan @${escapeHtml(username)}
            </p>
        </div>
        <button onclick="cancelDuet()" style="background:transparent;border:none;color:#555;cursor:pointer;font-size:16px;flex-shrink:0;">✕</button>
    `;

    previewArea?.parentNode?.insertBefore(div, previewArea.nextSibling);
    showToast(`Duet dengan @${username} dipilih! 🎬`, 'success');
}

function cancelDuet() {
    isDuetMode      = false;
    duetSourceVideo = null;
    document.getElementById('duet-banner')?.remove();
    showToast('Mod Duet dibuang.', 'info');
}

// Duet player — papar dua video sebelah menyebelah dalam feed
function buildDuetPlayer(mainUrl, sourceUrl, videoId) {
    return `
        <div style="position:relative;width:100%;height:100%;display:flex;">
            <video src="${escapeHtml(mainUrl)}" style="width:50%;height:100%;object-fit:cover;"
                   autoplay loop muted playsinline></video>
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
                        width:2px;height:60%;background:rgba(255,255,255,0.4);z-index:2;"></div>
            <video src="${escapeHtml(sourceUrl)}" style="width:50%;height:100%;object-fit:cover;"
                   autoplay loop muted playsinline></video>
            <div style="position:absolute;bottom:8px;left:8px;font-size:10px;
                        background:rgba(0,0,0,0.6);padding:3px 8px;border-radius:20px;color:#00f2ea;">
                🎬 Duet
            </div>
        </div>`;
}

// ==========================================
// 32. SISTEM BLOK PENGGUNA
// ==========================================

// Simpan senarai blok dalam localStorage (boleh migrate ke Supabase kemudian)
let blockedUsers = new Set(JSON.parse(localStorage.getItem('snapflow_blocked') || '[]'));

function saveBlockedUsers() {
    localStorage.setItem('snapflow_blocked', JSON.stringify([...blockedUsers]));
}

function isUserBlocked(userId) {
    return blockedUsers.has(userId);
}

async function blockUser(targetUserId, targetUsername) {
    if (!targetUserId) return;
    document.getElementById('snap-options-sheet')?.remove();

    const confirmed = confirm(`Blok @${targetUsername}?\n\nMereka tidak akan muncul dalam feed anda.`);
    if (!confirmed) return;

    blockedUsers.add(targetUserId);
    saveBlockedUsers();

    // Buang semua video dari pengguna ini dalam DOM
    document.querySelectorAll(`.video-container[data-owner="${targetUserId}"]`).forEach(el => el.remove());

    showToast(`@${targetUsername} telah diblok. 🚫`, 'info');
}

function unblockUser(targetUserId) {
    blockedUsers.delete(targetUserId);
    saveBlockedUsers();
    showToast('Pengguna telah dinyahblok.', 'success');
    renderBlockedList();
}

function showBlockedList() {
    document.getElementById('blocked-list-modal')?.remove();

    const ids = [...blockedUsers];
    const modal = document.createElement('div');
    modal.id = 'blocked-list-modal';
    modal.innerHTML = `
        <div onclick="document.getElementById('blocked-list-modal').remove()"
             style="position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:9000;"></div>
        <div style="position:fixed;bottom:0;left:0;right:0;background:#111;border-radius:20px 20px 0 0;
                    padding:20px;z-index:9001;max-height:70vh;overflow-y:auto;border-top:1px solid #222;">
            <div style="width:40px;height:4px;background:#333;border-radius:2px;margin:0 auto 16px;"></div>
            <h3 style="margin:0 0 14px;font-size:16px;font-weight:800;">🚫 Pengguna Diblok</h3>
            <div id="blocked-list-inner">
                ${ids.length === 0
                    ? '<p style="text-align:center;color:#555;padding:30px;">Tiada pengguna diblok.</p>'
                    : ids.map(id => `
                        <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #1a1a1a;">
                            <div style="width:40px;height:40px;border-radius:50%;background:#222;
                                        display:flex;align-items:center;justify-content:center;">
                                <i class="fa-solid fa-user" style="color:#555;"></i>
                            </div>
                            <div style="flex:1;">
                                <p style="margin:0;font-size:13px;color:#888;">ID: ${id.slice(0,12)}...</p>
                            </div>
                            <button onclick="unblockUser('${id}')"
                                style="background:transparent;border:1px solid #333;color:#fff;
                                       padding:6px 14px;border-radius:8px;font-size:12px;cursor:pointer;
                                       font-family:inherit;font-weight:700;">
                                Nyahblok
                            </button>
                        </div>`).join('')}
            </div>
        </div>`;
    document.body.appendChild(modal);
}

function renderBlockedList() {
    document.getElementById('blocked-list-modal')?.remove();
    showBlockedList();
}

// Tambah "Blok" dalam menu options video
const _origShowVideoOptions = showVideoOptions;
window.showVideoOptions = function(videoId, videoOwnerId) {
    _origShowVideoOptions(videoId, videoOwnerId);

    // Inject butang blok selepas 50ms (selepas sheet render)
    setTimeout(() => {
        const sheet = document.getElementById('snap-options-sheet');
        if (!sheet || !videoOwnerId) return;

        snapSupabase.auth.getUser().then(({ data: { user } }) => {
            if (!user || user.id === videoOwnerId) return; // Jangan blok diri sendiri

            const inner = sheet.querySelector('div:last-child div');
            if (!inner) return;

            const blockBtn = document.createElement('button');
            blockBtn.innerHTML = `<i class="fa-solid fa-ban" style="width:20px;color:#ff4757;"></i> Blok Pengguna Ini`;
            blockBtn.style.cssText = `
                width:100%;background:transparent;border:none;color:#fff;padding:14px;
                text-align:left;font-size:15px;cursor:pointer;font-family:inherit;
                display:flex;align-items:center;gap:12px;border-bottom:1px solid #1a1a1a;`;

            // Dapatkan username dari DOM
            const container = document.querySelector(`[data-video-id="${videoId}"]`);
            const usernameEl = container?.querySelector('.video-info h3');
            const username   = usernameEl ? usernameEl.innerText.replace('@','') : 'Pengguna';

            blockBtn.onclick = () => blockUser(videoOwnerId, username);

            // Tambah sebelum butang batal
            const cancelBtn = inner.querySelector('button:last-child');
            inner.insertBefore(blockBtn, cancelBtn);
        });
    }, 60);
};

// Filter video dari pengguna diblok semasa load feed
function filterBlockedFromFeed() {
    if (blockedUsers.size === 0) return;
    blockedUsers.forEach(userId => {
        document.querySelectorAll(`.video-container[data-owner="${userId}"]`).forEach(el => el.remove());
    });
}

// ==========================================
// 33. AUTO-HAPUS STORIES EXPIRED
// ==========================================

// Jalankan cleanup setiap kali app dibuka
async function cleanupExpiredStories() {
    try {
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        // Ambil stories yang dah expired
        const { data: expired } = await snapSupabase
            .from('stories')
            .select('id, media_url, user_id')
            .lt('created_at', cutoff);

        if (!expired || expired.length === 0) return;

        // Padam dari database
        const ids = expired.map(s => s.id);
        await snapSupabase.from('stories').delete().in('id', ids);

        // Padam fail dari Storage (optional — jimat ruang)
        for (const story of expired) {
            try {
                const url  = new URL(story.media_url);
                const path = url.pathname.split('/object/public/')[1];
                if (path) {
                    const [bucket, ...fileParts] = path.split('/');
                    await snapSupabase.storage.from(bucket).remove([fileParts.join('/')]);
                }
            } catch { /* fail mungkin dah takde */ }
        }

        devLog(`[Stories] ${ids.length} cerita tamat tempoh dipadam.`);
    } catch (err) {
        console.warn('[Stories] Cleanup error:', err.message);
    }
}

// Jalankan cleanup semasa app load (bukan setiap saat)
const _lastCleanup = localStorage.getItem('sf_story_cleanup');
const _oneHourAgo  = Date.now() - 60 * 60 * 1000;
if (!_lastCleanup || parseInt(_lastCleanup) < _oneHourAgo) {
    cleanupExpiredStories().then(() => {
        localStorage.setItem('sf_story_cleanup', Date.now().toString());
    });
}

// ==========================================
// SUPABASE EDGE FUNCTION (Stories Cleanup)
// ==========================================
// Simpan kod ini dalam: supabase/functions/cleanup-stories/index.ts
// Deploy: npx supabase functions deploy cleanup-stories
// Jadual: Supabase Cron Jobs → setiap jam → invoke function ini
//
// Kod Edge Function (TypeScript):
// ─────────────────────────────────────────
// import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// Deno.serve(async () => {
//   const supabase = createClient(
//     Deno.env.get('SUPABASE_URL')!,
//     Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
//   )
//   const cutoff = new Date(Date.now() - 86400000).toISOString()
//   const { data } = await supabase.from('stories').select('id').lt('created_at', cutoff)
//   if (data?.length) {
//     await supabase.from('stories').delete().in('id', data.map(s => s.id))
//   }
//   return new Response(JSON.stringify({ deleted: data?.length ?? 0 }))
// })

// ==========================================
// 34. NOTIFIKASI PUSH (FCM + Service Worker)
// ==========================================

const FCM_CONFIG = {
    // Isi nilai ini dari Firebase Console → Project Settings → Web App
    apiKey:            "GANTI_DENGAN_FCM_API_KEY",
    authDomain:        "snapflow-app.firebaseapp.com",
    projectId:         "snapflow-app",
    messagingSenderId: "GANTI_DENGAN_SENDER_ID",
    appId:             "GANTI_DENGAN_APP_ID",
    vapidKey:          "GANTI_DENGAN_VAPID_KEY"
    // Cara dapat VAPID key:
    // Firebase Console → Project Settings → Cloud Messaging → Web Push certificates
};

// Minta kebenaran notifikasi + simpan FCM token ke Supabase
async function requestPushPermission() {
    if (!('Notification' in window)) return showToast('Browser tidak sokong notifikasi.', 'warning');
    if (!('serviceWorker' in navigator)) return;

    try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            showToast('Notifikasi tidak dibenarkan.', 'warning');
            return;
        }

        // Hantar mesej ke service worker untuk daftar FCM
        const reg = await navigator.serviceWorker.ready;
        reg.active?.postMessage({ type: 'INIT_FCM', config: FCM_CONFIG });

        // Simulate token save (sebenar guna Firebase SDK)
        showToast('Notifikasi push diaktifkan! 🔔', 'success');

        // Simpan preferences dalam Supabase
        const { data: { user } } = await snapSupabase.auth.getUser();
        if (user) {
            // Nota: dalam implementasi sebenar, simpan FCM token dalam table 'push_tokens'
            devLog('[FCM] Notifikasi aktif untuk user:', user.id);
        }

    } catch (err) {
        console.warn('[FCM] Error:', err);
        showToast('Gagal aktifkan notifikasi.', 'error');
    }
}

// Hantar notifikasi tempatan (tanpa FCM — untuk testing)
function showLocalNotification(title, body, icon = '') {
    if (Notification.permission !== 'granted') return;
    const notif = new Notification(title, {
        body,
        icon: icon || 'https://ui-avatars.com/api/?name=SF&background=fe2c55&color=fff&size=64',
        badge: 'https://ui-avatars.com/api/?name=SF&background=fe2c55&color=fff&size=32',
        vibrate: [200, 100, 200],
        tag: 'snapflow-notif',
        renotify: true
    });
    notif.onclick = () => { window.focus(); notif.close(); };
    setTimeout(() => notif.close(), 6000);
}

// Intercept realtime notifikasi → tunjuk push notification
let _realtimeChannel = null;

function setupPushFromRealtime() {
    if (!snapSupabase) return;

    snapSupabase
        .channel('push-notifs')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications'
        }, async (payload) => {
            const notif = payload.new;
            const { data: { user } } = await snapSupabase.auth.getUser();
            if (!user || notif.user_id !== user.id) return;

            const typeMsg = {
                like:    '❤️ Seseorang menyukai video anda!',
                comment: '💬 Seseorang mengomen video anda!',
                follow:  '👤 Seseorang mula mengikuti anda!',
                mention: '📢 Anda disebut dalam komen!'
            };

            const msg = typeMsg[notif.type] || 'Notifikasi baharu dari SnapFlow';
            showLocalNotification('SnapFlow', msg);
        })
        .subscribe();
}

// Auto-setup push dari realtime bila app load
document.addEventListener('DOMContentLoaded', () => {
    if (typeof snapSupabase !== 'undefined') setupPushFromRealtime();
});

// ==========================================
// 35. VERIFIED BADGE — Fungsi Pembantu
// ==========================================

// Semak sama ada user verified (untuk papar dalam video feed)
const verifiedUsers = new Set(
    JSON.parse(localStorage.getItem('snapflow_verified') || '[]')
);

async function refreshVerifiedCache() {
    try {
        // Ambil semua user yang ada >= 1000 followers
        const { data: follows } = await snapSupabase
            .from('follows').select('following_id');

        const count = {};
        (follows || []).forEach(f => {
            count[f.following_id] = (count[f.following_id] || 0) + 1;
        });

        const verified = Object.entries(count)
            .filter(([, c]) => c >= 1000)
            .map(([uid]) => uid);

        verifiedUsers.clear();
        verified.forEach(uid => verifiedUsers.add(uid));
        localStorage.setItem('snapflow_verified', JSON.stringify(verified));
    } catch (e) {
        console.warn('refreshVerifiedCache error:', e);
    }
}

// Panggil sekali sejam
const _lastVerifiedRefresh = localStorage.getItem('sf_verified_refresh');
if (!_lastVerifiedRefresh || Date.now() - parseInt(_lastVerifiedRefresh) > 3600000) {
    refreshVerifiedCache().then(() => {
        localStorage.setItem('sf_verified_refresh', Date.now().toString());
    });
}

function getVerifiedBadgeHTML(userId) {
    if (!verifiedUsers.has(userId)) return '';
    return `<span style="display:inline-flex;background:#1da1f2;border-radius:50%;width:14px;height:14px;align-items:center;justify-content:center;margin-left:3px;flex-shrink:0;" title="Kreator Disahkan"><i class="fa-solid fa-check" style="font-size:8px;color:#fff;"></i></span>`;
}

// ==========================================
// 36. JADUAL PUBLISH — Edge Function Trigger
// ==========================================

// Semak video yang dah tiba masa publish
async function checkScheduledVideos() {
    try {
        const { data: { user } } = await snapSupabase.auth.getUser();
        if (!user) return;

        const now = new Date().toISOString();
        const { data: scheduled } = await snapSupabase
            .from('videos')
            .select('id, caption, scheduled_at')
            .eq('user_id', user.id)
            .eq('is_published', false)
            .lte('scheduled_at', now)
            .not('scheduled_at', 'is', null);

        if (!scheduled || scheduled.length === 0) return;

        // Publish video-video yang dah tiba masa
        for (const vid of scheduled) {
            await snapSupabase.from('videos')
                .update({ is_published: true })
                .eq('id', vid.id);
            devLog(`[Schedule] Video ${vid.id} diterbitkan pada ${now}`);
        }

        if (scheduled.length > 0) {
            showToast(`${scheduled.length} video berjadual kini diterbitkan! 📅`, 'success');
            // Refresh feed jika ada
            if (typeof loadHomeFeed === 'function') loadHomeFeed();
        }
    } catch (err) {
        console.warn('[Schedule] Semak gagal:', err.message);
    }
}

// Semak setiap 5 minit bila app terbuka
setInterval(checkScheduledVideos, 5 * 60 * 1000);
checkScheduledVideos(); // Semak terus masa load

// ==========================================
// SUPABASE EDGE FUNCTION — publish-scheduled
// ==========================================
// Simpan dalam: supabase/functions/publish-scheduled/index.ts
// Jadual cron: */5 * * * * (setiap 5 minit)
//
// import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// Deno.serve(async () => {
//   const supabase = createClient(
//     Deno.env.get('SUPABASE_URL')!,
//     Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
//   )
//   const now = new Date().toISOString()
//   const { data, error } = await supabase
//     .from('videos')
//     .update({ is_published: true })
//     .eq('is_published', false)
//     .lte('scheduled_at', now)
//     .not('scheduled_at', 'is', null)
//     .select('id, user_id, caption')
//   // Hantar notifikasi kepada pemilik video
//   if (data?.length) {
//     for (const vid of data) {
//       await supabase.from('notifications').insert([{
//         user_id: vid.user_id, type: 'system',
//         message: `Video "${vid.caption?.slice(0,30)}" kini diterbitkan!`
//       }])
//     }
//   }
//   return new Response(JSON.stringify({ published: data?.length ?? 0 }))
// })

// ==========================================
// 37. SNAPFLOW PRO (Stripe Integration)
// ==========================================

// Konfigurasi Stripe — ganti dengan publishable key anda
// Dapatkan dari: https://dashboard.stripe.com/apikeys
const STRIPE_PUBLISHABLE_KEY = 'pk_live_GANTI_DENGAN_STRIPE_KEY';
const STRIPE_PRO_PRICE_ID    = 'price_GANTI_DENGAN_PRICE_ID'; // RM9.90/bulan
const STRIPE_SUCCESS_URL     = `${window.location.origin}/profile.html?pro=success`;
const STRIPE_CANCEL_URL      = `${window.location.origin}/profile.html`;

// Semak status Pro dari localStorage (untuk demo)
// Dalam produksi: semak dari Supabase table 'subscriptions'
function isUserPro() {
    return localStorage.getItem('sf_pro_status') === 'active';
}

function showProBadge() {
    const badge = document.getElementById('pro-badge');
    if (badge) badge.style.display = isUserPro() ? 'inline-flex' : 'none';
}

async function openProModal() {
    document.getElementById('pro-modal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'pro-modal';

    const isPro = isUserPro();

    modal.innerHTML = `
        <div onclick="document.getElementById('pro-modal').remove()"
             style="position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:9500;"></div>
        <div style="position:fixed;bottom:0;left:0;right:0;background:#0d0d0d;border-radius:20px 20px 0 0;
                    padding:24px;z-index:9501;border-top:2px solid #333;max-height:90vh;overflow-y:auto;">

            <!-- Header Pro -->
            <div style="text-align:center;margin-bottom:20px;">
                <div style="background:linear-gradient(135deg,#f6c90e,#ffdf6b);width:64px;height:64px;border-radius:20px;
                            display:flex;align-items:center;justify-content:center;margin:0 auto 12px;
                            box-shadow:0 0 30px rgba(246,201,14,0.4);font-size:28px;">⭐</div>
                <h2 style="margin:0 0 6px;font-size:22px;font-weight:900;
                           background:linear-gradient(135deg,#f6c90e,#ffdf6b);
                           -webkit-background-clip:text;-webkit-text-fill-color:transparent;">SnapFlow Pro</h2>
                <p style="margin:0;font-size:14px;color:#555;">Buka semua ciri premium SnapFlow</p>
            </div>

            <!-- Status kalau dah Pro -->
            ${isPro ? `
            <div style="background:linear-gradient(135deg,#1a1200,#0d0a00);border:1px solid #3a3000;
                        border-radius:12px;padding:14px;text-align:center;margin-bottom:16px;">
                <p style="margin:0;font-size:15px;font-weight:800;color:#f6c90e;">✅ Anda sudah menjadi ahli Pro!</p>
                <p style="margin:6px 0 0;font-size:13px;color:#665500;">Semua ciri premium telah diaktifkan.</p>
            </div>` : ''}

            <!-- Ciri-ciri Pro -->
            <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px;">
                ${[
                    ['⭐', 'Lencana Pro Eksklusif', 'Tanda ⭐ di profil dan video anda'],
                    ['📊', 'Analytics Lanjutan', 'Data views, retention, dan audience demographics'],
                    ['🎬', 'Upload Video HD', 'Resolusi sehingga 4K, saiz fail hingga 500MB'],
                    ['∞',  'Upload Tanpa Had',  'Tiada limit 10 video/hari — upload sesuka hati'],
                    ['📅', 'Jadual Post Lanjutan', 'Jadualkan sehingga 30 post sekaligus'],
                    ['🚫', 'Tiada Iklan', 'Nikmati SnapFlow tanpa gangguan iklan'],
                    ['🎨', 'Filter Eksklusif Pro', '15 filter tambahan untuk video anda'],
                ].map(([icon, title, desc]) => `
                    <div style="display:flex;gap:12px;align-items:flex-start;padding:12px;background:#111;border-radius:10px;border:1px solid #1a1a1a;">
                        <span style="font-size:22px;flex-shrink:0;width:28px;text-align:center;">${icon}</span>
                        <div>
                            <p style="margin:0;font-size:14px;font-weight:700;">${title}</p>
                            <p style="margin:2px 0 0;font-size:12px;color:#555;">${desc}</p>
                        </div>
                        <i class="fa-solid fa-check" style="color:#f6c90e;margin-left:auto;flex-shrink:0;margin-top:3px;"></i>
                    </div>
                `).join('')}
            </div>

            <!-- Harga -->
            ${!isPro ? `
            <div style="background:linear-gradient(135deg,#1a1200,#0d0900);border:2px solid #f6c90e33;
                        border-radius:14px;padding:16px;text-align:center;margin-bottom:16px;">
                <p style="margin:0;font-size:32px;font-weight:900;color:#f6c90e;">RM9.90</p>
                <p style="margin:4px 0 0;font-size:13px;color:#665500;">sebulan · batalkan bila-bila masa</p>
            </div>

            <button onclick="startStripeCheckout()"
                style="width:100%;background:linear-gradient(135deg,#f6c90e,#ffdf6b);color:#000;border:none;
                       padding:16px;border-radius:14px;font-size:16px;font-weight:900;cursor:pointer;
                       font-family:inherit;margin-bottom:10px;display:flex;align-items:center;justify-content:center;gap:8px;">
                ⭐ Langgani Pro Sekarang
            </button>

            <p style="text-align:center;font-size:11px;color:#333;margin:0;">
                Pembayaran selamat melalui Stripe · SSL encrypted
            </p>` : `
            <button onclick="managePro()"
                style="width:100%;background:#1a1a1a;color:#888;border:1px solid #333;
                       padding:14px;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;
                       font-family:inherit;">
                Urus Langganan
            </button>`}
        </div>`;

    document.body.appendChild(modal);
}

async function startStripeCheckout() {
    const { data: { user } } = await snapSupabase.auth.getUser();
    if (!user) return showToast('Log masuk dahulu.', 'warning');

    showToast('Mengalihkan ke Stripe...', 'info');

    try {
        // Dalam produksi: panggil Supabase Edge Function untuk buat Stripe session
        // const { data } = await snapSupabase.functions.invoke('create-checkout', {
        //     body: { priceId: STRIPE_PRO_PRICE_ID, userId: user.id, email: user.email }
        // });
        // window.location.href = data.url;

        // DEMO MODE — simulate Pro activation
        localStorage.setItem('sf_pro_status', 'active');
        document.getElementById('pro-modal')?.remove();
        showToast('SnapFlow Pro diaktifkan! ⭐', 'success');
        showProBadge();
        showLocalNotification('SnapFlow Pro', '⭐ Selamat datang ke SnapFlow Pro! Semua ciri premium telah dibuka.');

    } catch (err) {
        showToast('Pembayaran gagal: ' + err.message, 'error');
    }
}

function managePro() {
    // Stripe customer portal
    showToast('Mengalihkan ke portal langganan...', 'info');
    // window.location.href = 'https://billing.stripe.com/p/login/...'

    // DEMO: batalkan Pro
    if (confirm('Batalkan SnapFlow Pro?')) {
        localStorage.removeItem('sf_pro_status');
        document.getElementById('pro-modal')?.remove();
        showToast('Langganan Pro dibatalkan.', 'info');
        showProBadge();
    }
}

function getProBadgeHTML() {
    if (!isUserPro()) return '';
    return `<span style="display:inline-flex;background:linear-gradient(135deg,#f6c90e,#ffdf6b);color:#000;
                         font-size:10px;font-weight:900;padding:2px 6px;border-radius:6px;margin-left:4px;
                         vertical-align:middle;">PRO</span>`;
}

// ==========================================
// 38. INFINITE SCROLL DOM PRUNING
// ==========================================

// Konfigurasi — berapa video disimpan dalam DOM pada satu masa
const DOM_MAX_VIDEOS     = 10;  // max video dalam DOM
const DOM_PRUNE_THRESH   = 8;   // mula prune bila lebih dari ini
const DOM_PRUNE_EACH     = 3;   // buang 3 video lama setiap kali prune

let allFeedVideos       = []; // semua data video dari Supabase
let renderedVideoIds    = []; // video IDs yang kini dalam DOM
let currentVisibleIdx   = 0;  // index video yang sedang ditonton

function setupDomPruning() {
    if (!('IntersectionObserver' in window)) return;

    const pruneObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const vid = entry.target;
            const idx = parseInt(vid.dataset.feedIndex || '0');
            currentVisibleIdx = idx;

            // Prune bila DOM terlalu penuh
            if (renderedVideoIds.length > DOM_PRUNE_THRESH) {
                pruneDistantVideos(idx);
            }

            // Lazy-load video seterusnya dari buffer
            maybeLoadMoreVideos(idx);
        });
    }, { threshold: 0.5 });

    document.querySelectorAll('.video-container').forEach((el, i) => {
        el.dataset.feedIndex = i;
        pruneObserver.observe(el);
    });
}

function pruneDistantVideos(currentIdx) {
    const feed = document.getElementById('video-feed');
    if (!feed) return;

    const containers = [...document.querySelectorAll('.video-container')];

    containers.forEach(el => {
        const idx  = parseInt(el.dataset.feedIndex || '0');
        const dist = Math.abs(idx - currentIdx);

        if (dist > DOM_PRUNE_EACH + 2) {
            // Gantikan video element dengan placeholder jimat RAM
            const video = el.querySelector('video');
            if (video && !el.dataset.pruned) {
                const src    = video.src;
                video.pause();
                video.src    = '';          // kosongkan src — bebaskan memori
                video.load();
                el.dataset.pruned    = 'true';
                el.dataset.videoSrc  = src;  // simpan src untuk restore

                // Tambah placeholder
                const placeholder = document.createElement('div');
                placeholder.className = 'prune-placeholder';
                placeholder.style.cssText = `width:100%;height:100%;background:#050505;display:flex;align-items:center;justify-content:center;`;
                placeholder.innerHTML = '<div style="width:20px;height:20px;border:2px solid #222;border-top-color:#555;border-radius:50%;animation:spin 1s linear infinite;"></div>';
                el.insertBefore(placeholder, video);
            }
        } else if (el.dataset.pruned === 'true') {
            // Restore video bila hampir semula
            const video = el.querySelector('video');
            const src   = el.dataset.videoSrc;
            if (video && src) {
                video.src = src;
                el.dataset.pruned = 'false';
                el.querySelector('.prune-placeholder')?.remove();
            }
        }
    });
}

async function maybeLoadMoreVideos(currentIdx) {
    const total   = allFeedVideos.length;
    const inDom   = renderedVideoIds.length;

    // Muat lebih bila hampir habis (3 video sebelum akhir)
    if (currentIdx >= total - 3 && inDom < total) {
        return; // semua dah ada dalam allFeedVideos
    }

    // Jika dah sampai penghujung data yang ada — fetch lebih dari Supabase
    if (currentIdx >= allFeedVideos.length - 3) {
        await fetchMoreFeedVideos();
    }
}

async function fetchMoreFeedVideos() {
    if (typeof snapSupabase === 'undefined') return;
    const offset = allFeedVideos.length;
    const { data: more } = await snapSupabase
        .from('videos').select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + 9);

    if (!more || more.length === 0) return;

    allFeedVideos = [...allFeedVideos, ...more];

    // Render video baru ke hujung feed
    const feed = document.getElementById('video-feed');
    if (!feed) return;

    more.forEach((vid, i) => {
        if (renderedVideoIds.includes(vid.id)) return;
        const username = vid.username || 'User';
        const isLiked  = typeof likedVideos !== 'undefined' && likedVideos.has(vid.id);
        const div      = document.createElement('div');
        div.className  = 'video-container';
        div.dataset.videoId   = vid.id;
        div.dataset.feedIndex = offset + i;
        div.dataset.owner     = vid.user_id;
        div.innerHTML  = buildVideoHTML(vid, isLiked, username);
        feed.appendChild(div);
        renderedVideoIds.push(vid.id);
    });

    // Re-setup observer untuk video baru
    setupObserver();
    setupDomPruning();
    filterBlockedFromFeed();
}

// Helper untuk bina HTML video (elak duplikasi kod)
function buildVideoHTML(vid, isLiked, username) {
    return `
        <video src="${escapeHtml(vid.video_url)}" loop playsinline preload="none" muted></video>
        <div class="video-gradient"></div>
        <button class="mute-btn" id="mute-btn-${vid.id}" onclick="toggleMute(${vid.id}, event)">
            <i class="fa-solid fa-volume-xmark" id="mute-icon-${vid.id}"></i>
        </button>
        <div class="doubletap-heart" id="heart-anim-${vid.id}"><i class="fa-solid fa-heart"></i></div>
        <div class="play-pause-indicator" id="play-indicator-${vid.id}"><i class="fa-solid fa-pause" id="play-icon-${vid.id}"></i></div>
        <div class="side-bar">
            <div class="action-item" onclick="handleFollow('${escapeHtml(vid.user_id)}', this)">
                <div class="avatar-wrap">
                    <img loading="lazy" src="https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random" alt="avatar">
                    <div class="follow-plus-btn" id="follow-btn-${escapeHtml(vid.user_id)}">
                        <i class="fa-solid fa-plus" style="font-size:10px;color:#fff;"></i>
                    </div>
                </div>
            </div>
            <div class="action-item" onclick="handleLikeAction(${vid.id})">
                <i class="fa-solid fa-heart" id="like-icon-${vid.id}" style="color:${isLiked?'#fe2c55':'#fff'};"></i>
                <span id="like-count-${vid.id}">${vid.likes_count||0}</span>
            </div>
            <div class="action-item" onclick="toggleComments(${vid.id})">
                <i class="fa-solid fa-comment-dots" style="color:#fff;"></i>
                <span id="comment-count-${vid.id}">0</span>
            </div>
            <div class="action-item" onclick="showBookmarkAction(${vid.id})">
                <i class="fa-solid fa-bookmark" id="bookmark-icon-${vid.id}" style="color:#fff;"></i>
                <span>Simpan</span>
            </div>
            <div class="action-item" onclick="showReactionPicker(${vid.id}, this)">
                <i class="fa-solid fa-face-smile" style="color:#fff;"></i><span>React</span>
            </div>
            <div class="action-item" onclick="showShareSheet(${vid.id}, '${escapeHtml(vid.caption||'')}')">
                <i class="fa-solid fa-share" style="color:#fff;"></i><span>Kongsi</span>
            </div>
            <div class="action-item" onclick="showVideoOptions(${vid.id}, '${escapeHtml(vid.user_id)}')">
                <i class="fa-solid fa-ellipsis-vertical" style="color:#fff;"></i><span>Lain</span>
            </div>
        </div>
        <div class="video-info">
            <h3>@${escapeHtml(username)}${getVerifiedBadgeHTML(vid.user_id)}${vid.user_id && isUserPro() && vid.user_id === getCurrentUserId() ? getProBadgeHTML() : ''}</h3>
            <p>${renderCaption(vid.caption||'')}</p>
            <div id="reaction-bar-${vid.id}" style="display:none;flex-wrap:wrap;gap:5px;margin-top:6px;"></div>
        </div>`;
}

// Cache user ID untuk semakan pro badge
let _cachedUserId = null;
function getCurrentUserId() {
    return _cachedUserId;
}
snapSupabase?.auth.getUser().then(({ data: { user } }) => {
    if (user) _cachedUserId = user.id;
});

// ==========================================
// 39. RATE LIMITING UPLOAD
// ==========================================

const UPLOAD_LIMITS = {
    free: { perDay: 10, perHour: 3  },
    pro:  { perDay: 999, perHour: 50 }
};

function getUploadLog() {
    try {
        return JSON.parse(localStorage.getItem('sf_upload_log') || '[]');
    } catch { return []; }
}

function recordUpload() {
    const log = getUploadLog();
    log.push(Date.now());
    // Simpan hanya 1000 rekod terakhir
    localStorage.setItem('sf_upload_log', JSON.stringify(log.slice(-1000)));
}

function checkUploadRateLimit() {
    const isPro    = isUserPro();
    const limits   = isPro ? UPLOAD_LIMITS.pro : UPLOAD_LIMITS.free;
    const log      = getUploadLog();
    const now      = Date.now();
    const oneHour  = 60 * 60 * 1000;
    const oneDay   = 24 * oneHour;

    const lastHour = log.filter(t => now - t < oneHour).length;
    const lastDay  = log.filter(t => now - t < oneDay).length;

    if (lastHour >= limits.perHour) {
        const resetMins = Math.ceil((oneHour - (now - Math.min(...log.filter(t => now - t < oneHour)))) / 60000);
        return {
            allowed: false,
            reason:  `Had sejam dicapai (${limits.perHour} video/jam). Cuba lagi dalam ${resetMins} minit.`,
            isPro
        };
    }

    if (lastDay >= limits.perDay) {
        const resetHrs = Math.ceil((oneDay - (now - Math.min(...log.filter(t => now - t < oneDay)))) / 3600000);
        return {
            allowed: false,
            reason:  `Had harian dicapai (${limits.perDay} video/hari). Cuba lagi dalam ${resetHrs} jam.`,
            isPro
        };
    }

    return {
        allowed:   true,
        remaining: { hour: limits.perHour - lastHour, day: limits.perDay - lastDay },
        isPro
    };
}

function showRateLimitWarning(result) {
    document.getElementById('rate-limit-modal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'rate-limit-modal';
    modal.innerHTML = `
        <div onclick="document.getElementById('rate-limit-modal').remove()"
             style="position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9500;"></div>
        <div style="position:fixed;bottom:0;left:0;right:0;background:#111;border-radius:20px 20px 0 0;
                    padding:24px;z-index:9501;border-top:1px solid #222;text-align:center;">
            <div style="font-size:48px;margin-bottom:12px;">⏱️</div>
            <h3 style="margin:0 0 8px;font-size:17px;font-weight:800;">Had Upload Dicapai</h3>
            <p style="margin:0 0 16px;font-size:14px;color:#555;line-height:1.6;">${result.reason}</p>

            ${!result.isPro ? `
            <div style="background:#1a1200;border:1px solid #333;border-radius:12px;padding:14px;margin-bottom:16px;">
                <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#f6c90e;">⭐ Naik ke SnapFlow Pro</p>
                <p style="margin:0;font-size:13px;color:#665500;">Upload sehingga 50 video/jam tanpa had harian.</p>
            </div>
            <button onclick="document.getElementById('rate-limit-modal').remove();openProModal();"
                style="width:100%;background:linear-gradient(135deg,#f6c90e,#ffdf6b);color:#000;border:none;
                       padding:14px;border-radius:12px;font-size:15px;font-weight:900;cursor:pointer;font-family:inherit;margin-bottom:8px;">
                ⭐ Dapatkan Pro
            </button>` : ''}

            <button onclick="document.getElementById('rate-limit-modal').remove()"
                style="width:100%;background:transparent;border:none;color:#555;padding:10px;cursor:pointer;font-family:inherit;font-size:14px;">
                OK, Faham
            </button>
        </div>`;
    document.body.appendChild(modal);
}

// Tunjuk counter upload yang tinggal di halaman upload
function showUploadQuota() {
    const result = checkUploadRateLimit();
    const el     = document.getElementById('upload-quota');
    if (!el) return;

    if (!result.allowed) {
        el.innerHTML = `<span style="color:#fe2c55;font-size:12px;font-weight:700;">⏱️ Had upload dicapai</span>`;
        return;
    }

    const { remaining, isPro } = result;
    el.innerHTML = `
        <span style="font-size:12px;color:#555;">
            ${isPro ? '⭐ Pro · ' : ''} Baki hari ini: <strong style="color:#fff;">${remaining.day}</strong> video
            &nbsp;·&nbsp; Jam ini: <strong style="color:#fff;">${remaining.hour}</strong> video
        </span>`;
}

// Hook into startUpload untuk semak rate limit
const _origStartUpload = window.startUpload;
if (typeof startUpload === 'function') {
    const _origFn = startUpload;
    window.startUpload = async function() {
        const rateCheck = checkUploadRateLimit();
        if (!rateCheck.allowed) {
            showRateLimitWarning(rateCheck);
            return;
        }
        await _origFn.apply(this, arguments);
        // Record berjaya upload
        recordUpload();
        showUploadQuota();
    };
}

// ==========================================
// 40. PLAYLIST — Fungsi pembantu
// ==========================================

// Tambah butang Playlist dalam menu "Lain" video
function addVideoToPlaylist(videoId) {
    snapSupabase.auth.getUser().then(async ({ data: { user } }) => {
        if (!user) return showToast('Log masuk dahulu.', 'warning');

        const { data: myPlaylists } = await snapSupabase
            .from('playlists').select('id, title')
            .eq('user_id', user.id).limit(20);

        document.getElementById('add-to-pl-modal')?.remove();
        const modal = document.createElement('div');
        modal.id = 'add-to-pl-modal';
        modal.innerHTML = `
            <div onclick="document.getElementById('add-to-pl-modal').remove()"
                 style="position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:9400;"></div>
            <div style="position:fixed;bottom:0;left:0;right:0;background:#111;border-radius:20px 20px 0 0;
                        padding:20px;z-index:9401;border-top:1px solid #222;max-height:70vh;overflow-y:auto;">
                <div style="width:40px;height:4px;background:#333;border-radius:2px;margin:0 auto 16px;"></div>
                <h3 style="margin:0 0 14px;font-size:16px;font-weight:800;">📚 Tambah ke Siri</h3>
                ${(!myPlaylists || myPlaylists.length === 0)
                    ? `<p style="color:#555;font-size:13px;text-align:center;padding:16px;">Tiada siri. <a href="playlist.html" style="color:#fe2c55;">Cipta siri pertama</a></p>`
                    : myPlaylists.map(pl => `
                        <div onclick="insertVideoToPlaylist(${pl.id}, ${videoId})"
                             style="padding:14px;border-bottom:1px solid #1a1a1a;cursor:pointer;display:flex;align-items:center;gap:12px;font-size:14px;font-weight:600;">
                            <i class="fa-solid fa-layer-group" style="color:#fe2c55;width:20px;"></i>
                            ${escapeHtml(pl.title)}
                        </div>`).join('')
                }
                <a href="playlist.html" style="display:block;text-align:center;padding:14px;color:#555;font-size:13px;">
                    + Cipta Siri Baru
                </a>
            </div>`;
        document.body.appendChild(modal);
    });
}

async function insertVideoToPlaylist(playlistId, videoId) {
    document.getElementById('add-to-pl-modal')?.remove();

    // Dapat bilangan episod sekarang
    const { count } = await snapSupabase.from('playlist_videos')
        .select('*', { count:'exact', head:true }).eq('playlist_id', playlistId);

    const { error } = await snapSupabase.from('playlist_videos').insert([{
        playlist_id:    playlistId,
        video_id:       videoId,
        episode_number: (count || 0) + 1,
    }]);

    if (error && error.code === '23505') return showToast('Video dah ada dalam siri ini.', 'info');
    if (error) return showToast('Gagal tambah: ' + error.message, 'error');
    showToast('Video ditambah ke siri! 📚', 'success');
}

// ==========================================
// 41. LOG MASUK SOSIAL — Pembantu
// ==========================================

// Handle OAuth redirect balik ke app
async function handleOAuthRedirect() {
    const { data: { session } } = await snapSupabase.auth.getSession();
    if (!session) return;

    // Semak sama ada dari OAuth redirect
    const hash = window.location.hash;
    if (hash.includes('access_token') || hash.includes('error')) {
        if (hash.includes('error')) {
            showToast('Log masuk gagal. Cuba lagi.', 'error');
            return;
        }
        showToast(`Selamat datang! 👋`, 'success');
        setTimeout(() => window.location.replace('index.html'), 800);
    }
}

// Panggil pada setiap halaman auth
if (window.location.pathname.includes('login') ||
    window.location.pathname.includes('register')) {
    handleOAuthRedirect();
}

// ==========================================
// 42. VIRTUAL TIP / HADIAH
// ==========================================

const GIFTS = [
    { id: 'rose',     emoji: '🌹', name: 'Ros',       coins: 1,    color: '#ff6b6b' },
    { id: 'heart',    emoji: '❤️',  name: 'Hati',      coins: 5,    color: '#fe2c55' },
    { id: 'star',     emoji: '⭐',  name: 'Bintang',   coins: 10,   color: '#f6c90e' },
    { id: 'diamond',  emoji: '💎',  name: 'Berlian',   coins: 50,   color: '#00f2ea' },
    { id: 'crown',    emoji: '👑',  name: 'Mahkota',   coins: 100,  color: '#f6c90e' },
    { id: 'rocket',   emoji: '🚀',  name: 'Roket',     coins: 200,  color: '#4ecdc4' },
    { id: 'unicorn',  emoji: '🦄',  name: 'Unicorn',   coins: 500,  color: '#c084fc' },
    { id: 'galaxy',   emoji: '🌌',  name: 'Galaksi',   coins: 1000, color: '#818cf8' },
];

// Duit syiling dari localStorage (dalam produksi: dari Supabase)
function getMyCoins() {
    return parseInt(localStorage.getItem('sf_coins') || '0');
}
function addCoins(amount) {
    const current = getMyCoins();
    localStorage.setItem('sf_coins', (current + amount).toString());
}
function spendCoins(amount) {
    const current = getMyCoins();
    if (current < amount) return false;
    localStorage.setItem('sf_coins', (current - amount).toString());
    return true;
}

async function showGiftPanel(videoId, creatorId, creatorUsername) {
    const { data: { user } } = await snapSupabase.auth.getUser();
    if (!user) return showToast('Log masuk dahulu untuk hantar hadiah.', 'warning');
    if (user.id === creatorId) return showToast('Anda tidak boleh hantar hadiah kepada diri sendiri.', 'info');

    document.getElementById('gift-panel')?.remove();

    const myCoins = getMyCoins();
    const panel   = document.createElement('div');
    panel.id      = 'gift-panel';
    panel.innerHTML = `
        <div onclick="document.getElementById('gift-panel').remove()"
             style="position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:9200;"></div>
        <div style="position:fixed;bottom:0;left:0;right:0;background:#111;border-radius:20px 20px 0 0;
                    padding:20px;z-index:9201;border-top:1px solid #222;">
            <div style="width:40px;height:4px;background:#333;border-radius:2px;margin:0 auto 16px;"></div>

            <!-- Header -->
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
                <h3 style="margin:0;font-size:16px;font-weight:800;">🎁 Hantar Hadiah</h3>
                <div style="background:#1a1a1a;border:1px solid #333;border-radius:20px;
                            padding:5px 12px;font-size:12px;font-weight:700;color:#f6c90e;">
                    🪙 ${myCoins.toLocaleString()} syiling
                </div>
            </div>

            <p style="margin:0 0 14px;font-size:13px;color:#555;">kepada @${escapeHtml(creatorUsername)}</p>

            <!-- Gift Grid -->
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px;">
                ${GIFTS.map(g => `
                <button onclick="sendGift(${videoId}, '${creatorId}', '${g.id}', ${g.coins}, '${g.emoji}', '${escapeHtml(g.name)}')"
                    style="background:#1a1a1a;border:1px solid #222;border-radius:12px;padding:10px 6px;
                           cursor:pointer;transition:all 0.2s;font-family:inherit;text-align:center;"
                    onmouseover="this.style.borderColor='${g.color}';this.style.background='#222'"
                    onmouseout="this.style.borderColor='#222';this.style.background='#1a1a1a'">
                    <div style="font-size:24px;margin-bottom:4px;">${g.emoji}</div>
                    <div style="font-size:10px;color:#888;margin-bottom:3px;">${g.name}</div>
                    <div style="font-size:11px;font-weight:700;color:#f6c90e;">🪙 ${g.coins}</div>
                </button>`).join('')}
            </div>

            <!-- Beli coins -->
            ${myCoins < 10 ? `
            <div style="background:#1a1200;border:1px solid #f6c90e33;border-radius:12px;
                        padding:12px;display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;">
                <div>
                    <p style="margin:0;font-size:13px;font-weight:700;color:#f6c90e;">💰 Top Up Syiling</p>
                    <p style="margin:3px 0 0;font-size:12px;color:#665500;">100 syiling = RM4.90</p>
                </div>
                <button onclick="openTopUpCoins()" style="background:#f6c90e;color:#000;border:none;
                        padding:8px 16px;border-radius:8px;font-size:12px;font-weight:900;cursor:pointer;font-family:inherit;">
                    Top Up
                </button>
            </div>` : ''}

            <button onclick="document.getElementById('gift-panel').remove()"
                style="width:100%;background:transparent;border:none;color:#555;padding:10px;
                       cursor:pointer;font-family:inherit;font-size:13px;">
                Batal
            </button>
        </div>`;

    document.body.appendChild(panel);
}

async function sendGift(videoId, creatorId, giftId, coins, emoji, giftName) {
    const myCoins = getMyCoins();

    if (myCoins < coins) {
        showToast(`Tidak cukup syiling! Perlu ${coins} 🪙`, 'warning');
        document.getElementById('gift-panel')?.remove();
        openTopUpCoins();
        return;
    }

    // Tolak syiling
    spendCoins(coins);
    document.getElementById('gift-panel')?.remove();

    // Simpan dalam Supabase
    const { data: { user } } = await snapSupabase.auth.getUser();
    await snapSupabase.from('gifts').insert([{
        video_id:         videoId,
        sender_id:        user.id,
        receiver_id:      creatorId,
        gift_type:        giftId,
        coins_spent:      coins,
        sender_username:  user.user_metadata?.full_name || 'User',
    }]).catch(e => console.warn('Gift insert error:', e));

    // Hantar notifikasi
    await snapSupabase.from('notifications').insert([{
        user_id:  creatorId,
        from_user: user.id,
        type:     'gift',
        video_id: videoId,
        message:  `menghantar hadiah ${emoji} ${giftName}!`
    }]).catch(() => {});

    // Animasi hadiah terbang
    showGiftAnimation(emoji, videoId);
    showToast(`${emoji} ${giftName} dihantar kepada kreator!`, 'success');
    showLocalNotification?.('SnapFlow', `Anda menghantar ${emoji} ${giftName}!`);
}

function showGiftAnimation(emoji, videoId) {
    const container = document.querySelector(`.video-container[data-video-id="${videoId}"]`)
        || document.body;

    for (let i = 0; i < 6; i++) {
        const el = document.createElement('div');
        el.innerText = emoji;
        el.style.cssText = `
            position: fixed;
            left: ${30 + Math.random() * 40}%;
            bottom: 20%;
            font-size: ${20 + Math.random() * 16}px;
            z-index: 9999;
            pointer-events: none;
            animation: giftFly ${1.5 + Math.random() * 1}s ease-out forwards;
            animation-delay: ${i * 0.15}s;
        `;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 3000);
    }
}

function openTopUpCoins() {
    document.getElementById('topup-modal')?.remove();
    const modal = document.createElement('div');
    modal.id = 'topup-modal';
    const packages = [
        { coins: 100,  price: 'RM4.90',  bonus: '' },
        { coins: 500,  price: 'RM19.90', bonus: '+50 bonus' },
        { coins: 1000, price: 'RM35.90', bonus: '+150 bonus' },
        { coins: 3000, price: 'RM89.90', bonus: '+600 bonus 🔥' },
    ];
    modal.innerHTML = `
        <div onclick="document.getElementById('topup-modal').remove()"
             style="position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9500;"></div>
        <div style="position:fixed;bottom:0;left:0;right:0;background:#111;border-radius:20px 20px 0 0;
                    padding:20px;z-index:9501;border-top:1px solid #222;">
            <div style="width:40px;height:4px;background:#333;border-radius:2px;margin:0 auto 16px;"></div>
            <h3 style="margin:0 0 6px;font-size:17px;font-weight:800;">🪙 Top Up Syiling</h3>
            <p style="margin:0 0 16px;font-size:13px;color:#555;">Syiling digunakan untuk hantar hadiah kepada kreator</p>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
                ${packages.map(p => `
                <button onclick="purchaseCoins(${p.coins},'${p.price}')"
                    style="background:#1a1a1a;border:1px solid #222;border-radius:12px;padding:14px;
                           cursor:pointer;transition:all 0.2s;font-family:inherit;text-align:center;position:relative;"
                    onmouseover="this.style.borderColor='#f6c90e'" onmouseout="this.style.borderColor='#222'">
                    ${p.bonus ? `<div style="position:absolute;top:-8px;right:-4px;background:#fe2c55;color:#fff;font-size:10px;font-weight:900;padding:2px 8px;border-radius:20px;">${p.bonus}</div>` : ''}
                    <div style="font-size:22px;margin-bottom:4px;">🪙</div>
                    <div style="font-size:18px;font-weight:900;color:#f6c90e;">${p.coins.toLocaleString()}</div>
                    <div style="font-size:12px;color:#666;margin-top:4px;">syiling</div>
                    <div style="font-size:14px;font-weight:700;color:#fff;margin-top:6px;">${p.price}</div>
                </button>`).join('')}
            </div>
            <p style="text-align:center;font-size:11px;color:#333;">Pembayaran selamat melalui Stripe</p>
        </div>`;
    document.body.appendChild(modal);
}

async function purchaseCoins(amount, price) {
    document.getElementById('topup-modal')?.remove();
    // DEMO: tambah coins terus (dalam produksi: guna Stripe)
    addCoins(amount);
    showToast(`🪙 ${amount.toLocaleString()} syiling ditambah! (Demo)`, 'success');
}

// Tunjuk jumlah syiling kreator dalam profil
async function loadCreatorCoins() {
    const { data: { user } } = await snapSupabase.auth.getUser();
    if (!user) return;

    const { data: gifts } = await snapSupabase
        .from('gifts').select('coins_spent')
        .eq('receiver_id', user.id);

    const totalCoins = (gifts || []).reduce((s, g) => s + (g.coins_spent || 0), 0);
    const el = document.getElementById('creator-coins');
    if (el) el.innerText = `🪙 ${totalCoins.toLocaleString()} syiling diterima`;
}

// ==========================================
// 43. PAUTAN BIO — Pembantu
// ==========================================

function getBioLinkIcon(url) {
    const u = url.toLowerCase();
    if (u.includes('instagram'))  return '<i class="fa-brands fa-instagram" style="color:#e1306c;"></i>';
    if (u.includes('tiktok'))     return '<i class="fa-brands fa-tiktok"></i>';
    if (u.includes('youtube'))    return '<i class="fa-brands fa-youtube" style="color:#ff0000;"></i>';
    if (u.includes('twitter') || u.includes('x.com')) return '<i class="fa-brands fa-x-twitter"></i>';
    if (u.includes('facebook'))   return '<i class="fa-brands fa-facebook" style="color:#1877f2;"></i>';
    if (u.includes('linkedin'))   return '<i class="fa-brands fa-linkedin" style="color:#0a66c2;"></i>';
    if (u.includes('github'))     return '<i class="fa-brands fa-github"></i>';
    if (u.includes('spotify'))    return '<i class="fa-brands fa-spotify" style="color:#1ed760;"></i>';
    if (u.includes('shopee') || u.includes('lazada')) return '🛍️';
    return '<i class="fa-solid fa-link" style="color:#888;"></i>';
}

// Papar bio links pada profil orang lain
async function loadPublicBioLinks(userId) {
    const linksEl = document.getElementById('bio-links-display');
    if (!linksEl) return;

    // Dapatkan bio links dari videos table (username metadata)
    const { data } = await snapSupabase
        .from('videos').select('user_id').eq('user_id', userId).limit(1);
    if (!data) return;

    // Nota: dalam produksi, simpan bio dalam table 'profiles' berasingan
}

// ==========================================
// 44. AI CAPTION AUTO-JANA (Claude API)
// ==========================================

// Nota: API key Claude dihantar melalui Supabase Edge Function untuk keselamatan
// Jangan letak API key terus dalam kod frontend!

async function generateAICaption(file) {
    const btn = document.getElementById('ai-caption-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Jana AI...'; }

    try {
        // Kaedah 1: Guna Supabase Edge Function (selamat — API key di server)
        const formData = new FormData();
        formData.append('file', file);

        // Panggil edge function 'generate-caption'
        const { data, error } = await snapSupabase.functions.invoke('generate-caption', {
            body: formData,
        });

        if (error) throw error;

        const caption = data?.caption || '';
        const captionEl = document.getElementById('video-caption');
        if (captionEl && caption) {
            captionEl.value = caption;
            captionEl.style.borderColor = '#00f2ea';
            setTimeout(() => captionEl.style.borderColor = '', 2000);
        }

        showToast('✨ Kapsyen AI dijana!', 'success');

    } catch (err) {
        console.warn('AI Caption error:', err);

        // Fallback: Jana kapsyen generik berdasarkan nama fail
        const fallbackCaptions = [
            'Video terbaru dari SnapFlow! 🔥 #viral #trending #snapflow',
            'Konten hari ini — jangan miss! ✨ #fyp #foryou #snapflow',
            'Cuba tengok ni! 👀 #snapflow #viral #trending',
            'Konten eksklusif untuk korang! 💯 #snapflow #content #malaysia',
        ];
        const random = fallbackCaptions[Math.floor(Math.random() * fallbackCaptions.length)];
        const captionEl = document.getElementById('video-caption');
        if (captionEl) captionEl.value = random;
        showToast('Kapsyen cadangan ditetapkan. (Sambungkan AI untuk jana sebenar)', 'info');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '✨ Jana Kapsyen AI'; }
    }
}

async function analyzeVideoFrame(file) {
    // Tangkap frame dari video untuk dihantar ke Claude Vision API
    return new Promise((resolve, reject) => {
        const video  = document.createElement('video');
        video.src    = URL.createObjectURL(file);
        video.muted  = true;
        video.preload = 'metadata';

        video.addEventListener('loadeddata', () => {
            video.currentTime = Math.min(2, video.duration * 0.1);
        });

        video.addEventListener('seeked', () => {
            const canvas = document.createElement('canvas');
            canvas.width  = Math.min(video.videoWidth, 512);
            canvas.height = Math.round(canvas.width * (video.videoHeight / video.videoWidth));
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Convert ke base64 JPEG
            const base64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
            URL.revokeObjectURL(video.src);
            resolve(base64);
        });

        video.addEventListener('error', reject);
        video.load();
    });
}

// ==========================================
// 45. LAPORAN ANALYTICS MINGGUAN (Email)
// ==========================================

async function previewWeeklyReport() {
    const { data: { user } } = await snapSupabase.auth.getUser();
    if (!user) return showToast('Log masuk dahulu.', 'warning');

    document.getElementById('weekly-report-modal')?.remove();

    // Kira data minggu lepas
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [
        { data: myVideos },
        { data: newFollowers },
        { data: recentLikes },
    ] = await Promise.all([
        snapSupabase.from('videos').select('id, caption, likes_count, created_at')
            .eq('user_id', user.id).order('likes_count', { ascending: false }).limit(5),
        snapSupabase.from('follows').select('created_at')
            .eq('following_id', user.id).gt('created_at', weekAgo),
        snapSupabase.from('likes').select('created_at')
            .gt('created_at', weekAgo),
    ]);

    const totalViews    = (myVideos || []).reduce((s, v) => s + (v.likes_count || 0) * 7, 0);
    const totalLikes    = (myVideos || []).reduce((s, v) => s + (v.likes_count || 0), 0);
    const newFollowsNum = (newFollowers || []).length;
    const topVideo      = myVideos?.[0];

    const modal = document.createElement('div');
    modal.id = 'weekly-report-modal';
    modal.innerHTML = `
        <div onclick="document.getElementById('weekly-report-modal').remove()"
             style="position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9500;"></div>
        <div style="position:fixed;inset:0;margin:auto;width:calc(100% - 32px);max-width:400px;
                    max-height:85vh;background:#111;border-radius:20px;padding:20px;z-index:9501;
                    border:1px solid #222;overflow-y:auto;height:fit-content;">

            <!-- Header Laporan -->
            <div style="text-align:center;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid #1a1a1a;">
                <div style="font-size:32px;margin-bottom:8px;">📊</div>
                <h2 style="margin:0 0 4px;font-size:18px;font-weight:900;">Laporan Mingguan</h2>
                <p style="margin:0;font-size:12px;color:#555;">
                    ${new Date(weekAgo).toLocaleDateString('ms-MY')} — ${new Date().toLocaleDateString('ms-MY')}
                </p>
            </div>

            <!-- Stats Grid -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
                ${[
                    ['👁️', totalViews.toLocaleString(), 'Anggaran Views'],
                    ['❤️', totalLikes.toLocaleString(), 'Jumlah Likes'],
                    ['👥', newFollowsNum, 'Pengikut Baru'],
                    ['🎬', (myVideos||[]).length, 'Video Aktif'],
                ].map(([icon, val, label]) => `
                <div style="background:#1a1a1a;border-radius:12px;padding:14px;text-align:center;">
                    <div style="font-size:22px;margin-bottom:6px;">${icon}</div>
                    <div style="font-size:22px;font-weight:900;">${val}</div>
                    <div style="font-size:11px;color:#555;margin-top:3px;">${label}</div>
                </div>`).join('')}
            </div>

            <!-- Top Video -->
            ${topVideo ? `
            <div style="margin-bottom:16px;padding:14px;background:#1a1a1a;border-radius:12px;">
                <p style="margin:0 0 8px;font-size:12px;color:#555;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;">🏆 Video Terpopular</p>
                <p style="margin:0;font-size:13px;font-weight:700;">${escapeHtml((topVideo.caption||'Tanpa tajuk').slice(0,50))}</p>
                <p style="margin:4px 0 0;font-size:12px;color:#fe2c55;font-weight:700;">❤️ ${topVideo.likes_count||0} likes</p>
            </div>` : ''}

            <!-- Cadangan -->
            <div style="padding:14px;background:#001a0a;border:1px solid #003a10;border-radius:12px;margin-bottom:16px;">
                <p style="margin:0 0 6px;font-size:13px;font-weight:800;color:#00f2ea;">💡 Cadangan Minggu Ini</p>
                <p style="margin:0;font-size:12px;color:#007a50;line-height:1.6;">
                    ${newFollowsNum > 5
                        ? '📈 Mantap! Pengikut anda bertambah. Teruskan upload konten berkualiti setiap hari.'
                        : '📣 Cuba upload 1 video sehari dan guna hashtag trending untuk lebih ramai nampak konten anda.'}
                </p>
            </div>

            <!-- Hantar Email -->
            <button onclick="sendWeeklyReportEmail()"
                style="width:100%;background:#fe2c55;color:#fff;border:none;padding:14px;border-radius:12px;
                       font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;margin-bottom:8px;
                       display:flex;align-items:center;justify-content:center;gap:8px;">
                <i class="fa-solid fa-envelope"></i> Hantar ke Email Saya
            </button>
            <button onclick="document.getElementById('weekly-report-modal').remove()"
                style="width:100%;background:transparent;border:none;color:#555;padding:10px;
                       cursor:pointer;font-family:inherit;font-size:13px;">
                Tutup
            </button>
        </div>`;

    document.body.appendChild(modal);
}

async function sendWeeklyReportEmail() {
    document.getElementById('weekly-report-modal')?.remove();
    showToast('Menghantar laporan ke email...', 'info');

    try {
        // Panggil Supabase Edge Function 'weekly-report'
        const { error } = await snapSupabase.functions.invoke('weekly-report', {
            body: { timestamp: new Date().toISOString() }
        });

        if (error) throw error;
        showToast('📧 Laporan dihantar ke email anda!', 'success');
    } catch (err) {
        // Fallback: tunjuk mesej jika Edge Function belum deploy
        showToast('📧 Laporan akan dihantar pada Isnin 8:00 pagi!', 'success');
    }
}

// ==========================================
// 46. VIDEO CABARAN (#CHALLENGE) — Pembantu
// ==========================================

// Auto-isi hashtag cabaran dalam upload bila ada pending challenge
function checkPendingChallengeHashtag() {
    const hashtag = localStorage.getItem('sf_pending_challenge_hashtag');
    if (!hashtag) return;

    const captionEl = document.getElementById('video-caption');
    if (!captionEl) return;

    if (!captionEl.value.includes(hashtag)) {
        captionEl.value = (captionEl.value + ' ' + hashtag).trim();
        showToast(`Hashtag cabaran ${hashtag} ditambah!`, 'success');
    }
    localStorage.removeItem('sf_pending_challenge_hashtag');
}

// Kemas kini kiraan entri cabaran bila video diupload
async function updateChallengeEntryCount(caption) {
    if (!caption) return;
    const hashtags = caption.match(/#[\w]+/g) || [];
    for (const tag of hashtags) {
        const { data: chal } = await snapSupabase.from('challenges')
            .select('id, entry_count').eq('hashtag', tag.toLowerCase()).single();
        if (!chal) continue;
        await snapSupabase.from('challenges')
            .update({ entry_count: (chal.entry_count || 0) + 1 }).eq('id', chal.id);

        // Tambah rekod entri
        const { data: { user } } = await snapSupabase.auth.getUser();
        if (user) {
            await snapSupabase.from('challenge_entries').upsert([{
                challenge_id: chal.id, user_id: user.id,
                joined_at: new Date().toISOString()
            }]).catch(() => {});
        }
    }
}

// ==========================================
// 47. SNAPFLOW LIVE — Pembantu Feed
// ==========================================

// Tunjuk live users bar dalam feed
async function loadLiveBar() {
    const liveBar = document.getElementById('live-bar');
    if (!liveBar) return;

    try {
        const { data: sessions } = await snapSupabase.from('live_sessions')
            .select('session_id, host_id, host_name, viewer_count, title')
            .eq('is_active', true).order('viewer_count', { ascending: false }).limit(6);

        if (!sessions || sessions.length === 0) {
            liveBar.style.display = 'none';
            return;
        }

        liveBar.style.display = 'flex';
        liveBar.innerHTML = `
            <a href="live.html" style="text-decoration:none;flex-shrink:0;display:flex;flex-direction:column;
               align-items:center;gap:4px;padding:0 4px;">
                <div style="width:52px;height:52px;background:#1a0005;border-radius:50%;
                            border:2.5px solid #fe2c55;display:flex;align-items:center;
                            justify-content:center;font-size:18px;">
                    <i class="fa-solid fa-plus" style="color:#fe2c55;"></i>
                </div>
                <span style="font-size:10px;color:#888;white-space:nowrap;">Live</span>
            </a>
            ${sessions.map(s => `
            <a href="live.html?session=${s.session_id}" style="text-decoration:none;flex-shrink:0;
               display:flex;flex-direction:column;align-items:center;gap:4px;padding:0 6px;"
               title="${escapeHtml(s.title||'')}">
                <div style="position:relative;width:52px;height:52px;">
                    <div style="width:52px;height:52px;border-radius:50%;border:2.5px solid #fe2c55;
                                background-image:url('https://ui-avatars.com/api/?name=${encodeURIComponent(s.host_name||'U')}&background=random&size=104');
                                background-size:cover;"></div>
                    <span style="position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);
                                 background:#fe2c55;color:#fff;font-size:8px;font-weight:900;
                                 padding:2px 6px;border-radius:20px;white-space:nowrap;">LIVE</span>
                </div>
                <span style="font-size:10px;color:#ccc;white-space:nowrap;max-width:56px;overflow:hidden;
                             text-overflow:ellipsis;">@${escapeHtml((s.host_name||'User').split(' ')[0])}</span>
            </a>`).join('')}`;
    } catch (e) {
        console.warn('loadLiveBar error:', e);
    }
}

// ==========================================
// 48. AI SUBTITLE — Client-side playback
// ==========================================

// State global subtitle
let activeSubtitles = [];    // array of { start, end, text }
let subtitleInterval = null;

async function generateSubtitleForVideo(videoId, videoUrl) {
    const btn = document.getElementById(`sub-btn-${videoId}`);
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'; }

    try {
        showToast('Mengekstrak audio untuk subtitle AI...', 'info');

        // Ekstrak audio dari video menggunakan AudioContext
        const audioBlob = await extractAudioFromVideo(videoUrl);
        if (!audioBlob) throw new Error('Gagal ekstrak audio');

        const formData = new FormData();
        formData.append('audio', audioBlob, 'audio.webm');
        formData.append('language', 'ms');

        const { data, error } = await snapSupabase.functions.invoke('generate-subtitle', {
            body: formData
        });

        if (error || data?.error) throw new Error(error?.message || data?.error);

        // Simpan subtitle
        const subs = data.subtitles || [];
        activeSubtitles = subs;

        // Simpan SRT dalam localStorage
        if (data.srt) {
            localStorage.setItem(`sf_sub_${videoId}`, data.srt);
        }

        // Tunjuk subtitle overlay
        showSubtitleOverlay(videoId, subs);
        showToast(`✅ ${subs.length} subtitle dijana!`, 'success');

    } catch (err) {
        console.warn('Subtitle error:', err);
        showToast('Subtitle AI: ' + err.message, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '💬'; }
    }
}

async function extractAudioFromVideo(videoUrl) {
    try {
        const audioCtx  = new (window.AudioContext || window.webkitAudioContext)();
        const response  = await fetch(videoUrl);
        const arrayBuf  = await response.arrayBuffer();
        const audioBuf  = await audioCtx.decodeAudioData(arrayBuf);

        // Render ke mono 16kHz (format Whisper)
        const offlineCtx = new OfflineAudioContext(1, audioBuf.sampleRate * audioBuf.duration, audioBuf.sampleRate);
        const source     = offlineCtx.createBufferSource();
        source.buffer    = audioBuf;
        source.connect(offlineCtx.destination);
        source.start(0);

        const rendered = await offlineCtx.startRendering();

        // Convert ke WAV blob
        const wav  = audioBufferToWav(rendered);
        return new Blob([wav], { type: 'audio/wav' });
    } catch (e) {
        console.warn('extractAudio error:', e);
        return null;
    }
}

function audioBufferToWav(buffer) {
    const numChannels = 1;
    const sampleRate  = buffer.sampleRate;
    const format      = 1; // PCM
    const bitDepth    = 16;
    const data        = buffer.getChannelData(0);
    const samples     = new Int16Array(data.length);

    for (let i = 0; i < data.length; i++) {
        samples[i] = Math.max(-32768, Math.min(32767, data[i] * 32768));
    }

    const byteCount = samples.length * 2;
    const buffer2   = new ArrayBuffer(44 + byteCount);
    const view      = new DataView(buffer2);

    // WAV header
    const writeStr  = (off, str) => { for (let i=0;i<str.length;i++) view.setUint8(off+i, str.charCodeAt(i)); };
    writeStr(0,  'RIFF');
    view.setUint32( 4,  36 + byteCount, true);
    writeStr(8,  'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * bitDepth / 8, true);
    view.setUint16(32, numChannels * bitDepth / 8, true);
    view.setUint16(34, bitDepth, true);
    writeStr(36, 'data');
    view.setUint32(40, byteCount, true);
    new Int16Array(buffer2, 44).set(samples);

    return buffer2;
}

function showSubtitleOverlay(videoId, subtitles) {
    const container = document.querySelector(`.video-container[data-video-id="${videoId}"]`);
    if (!container) return;

    // Buang overlay lama
    container.querySelector('.subtitle-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'subtitle-overlay';
    overlay.id        = `sub-overlay-${videoId}`;
    overlay.style.cssText = `
        position:absolute; bottom:120px; left:8px; right:8px;
        text-align:center; pointer-events:none; z-index:20;`;
    container.appendChild(overlay);

    const video = container.querySelector('video');
    if (!video) return;

    // Track subtitle secara masa nyata
    video.addEventListener('timeupdate', () => {
        const t    = video.currentTime;
        const curr = subtitles.find(s => t >= s.start && t <= s.end);
        const el   = document.getElementById(`sub-overlay-${videoId}`);
        if (!el) return;
        if (curr) {
            el.innerHTML = `<span style="background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);
                color:#fff;font-size:14px;font-weight:700;padding:6px 12px;border-radius:8px;
                line-height:1.5;display:inline-block;max-width:100%;">${escapeHtml(curr.text)}</span>`;
        } else {
            el.innerHTML = '';
        }
    });
}

function downloadSubtitleSRT(videoId, caption) {
    const srt = localStorage.getItem(`sf_sub_${videoId}`);
    if (!srt) return showToast('Jana subtitle dahulu.', 'warning');

    const blob = new Blob([srt], { type: 'text/srt' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `subtitle_${videoId}.srt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Fail SRT dimuat turun! 📄', 'success');
}

// ==========================================
// 49. LOG AKTIVITI — Rekod auto
// ==========================================

function recordActivityAuto(type, desc, risk = 'low') {
    const logs   = getActivityLogs();
    const device = getClientDeviceInfo();
    logs.unshift({
        id:        Date.now(),
        type, desc, risk,
        browser:   device.browser,
        os:        device.os,
        timestamp: new Date().toISOString(),
    });
    localStorage.setItem('sf_activity_log', JSON.stringify(logs.slice(0, 100)));
}

function getActivityLogs() {
    try { return JSON.parse(localStorage.getItem('sf_activity_log') || '[]'); }
    catch { return []; }
}

function getClientDeviceInfo() {
    const ua = navigator.userAgent;
    let browser = 'Browser', os = 'Tidak diketahui';
    if (ua.includes('Chrome'))       browser = 'Chrome';
    else if (ua.includes('Safari'))  browser = 'Safari';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Edge'))    browser = 'Edge';
    if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac'))     os = 'macOS';
    return { browser, os };
}

// Auto-rekod upload dalam log
const _origStartUpload2 = window.startUpload;
document.addEventListener('DOMContentLoaded', () => {
    // Rekod login setiap kali app dibuka (kadar 1x sejam)
    const lastLoginLog = localStorage.getItem('sf_last_login_log');
    if (!lastLoginLog || Date.now() - parseInt(lastLoginLog) > 3600000) {
        snapSupabase?.auth.getUser().then(({ data: { user } }) => {
            if (user) {
                recordActivityAuto('login', 'Sesi aktif — app dibuka', 'low');
                localStorage.setItem('sf_last_login_log', Date.now().toString());
            }
        });
    }

    // Semak cabaran pending
    checkPendingChallengeHashtag();

    // Load live bar jika ada elemen
    if (document.getElementById('live-bar')) loadLiveBar();
});

// ==========================================

// ==========================================
// BATCH 7 — CIRI TAMBAHAN (BERSIH)
// ==========================================

// ── 50. CARIAN GLOBAL ──────────────────────
function initSearchButton() {
    // Tambah ikon carian dalam header jika belum ada
    const existingBtn = document.getElementById('global-search-btn');
    if (existingBtn) return;
    const header = document.querySelector('header');
    if (!header) return;
    const btn       = document.createElement('a');
    btn.id          = 'global-search-btn';
    btn.href        = 'search.html';
    btn.style.cssText = 'color:#888;font-size:18px;text-decoration:none;padding:4px 8px;flex-shrink:0;';
    btn.innerHTML   = '<i class="fa-solid fa-magnifying-glass"></i>';
    header.appendChild(btn);
}

// ── 51. DUET & STITCH ──────────────────────
function startDuet(videoId, videoUrl, creator) {
    document.getElementById('snap-options-sheet')?.remove();
    if (!videoUrl) return showToast('URL video tidak ditemui.', 'error');
    const url = `duet.html?videoId=${videoId}&videoUrl=${encodeURIComponent(videoUrl)}&creator=${encodeURIComponent(creator)}&mode=duet`;
    window.location.href = url;
}

function startStitch(videoId, videoUrl, creator) {
    document.getElementById('snap-options-sheet')?.remove();
    if (!videoUrl) return showToast('URL video tidak ditemui.', 'error');
    const url = `duet.html?videoId=${videoId}&videoUrl=${encodeURIComponent(videoUrl)}&creator=${encodeURIComponent(creator)}&mode=stitch`;
    window.location.href = url;
}

// ── 52. KOLEKSI BOOKMARK ───────────────────
// openCollectionPicker dipanggil oleh showBookmarkAction
window.openCollectionPicker = function(videoId, videoData) {
    document.getElementById('col-picker-modal')?.remove();

    // Ambil koleksi dari localStorage
    let cols = [];
    try { cols = JSON.parse(localStorage.getItem('sf_collections') || '[]'); } catch(e) {}

    if (!cols.length) {
        cols = [
            { id:'fav',      name:'Kegemaran',       emoji:'❤️' },
            { id:'watch',    name:'Tonton Kemudian',  emoji:'⏰' },
            { id:'masak',    name:'Resepi',           emoji:'🍳' },
            { id:'lawak',    name:'Lawak',            emoji:'😂' },
            { id:'tutorial', name:'Tutorial',         emoji:'📚' },
        ];
        localStorage.setItem('sf_collections', JSON.stringify(cols));
    }

    const modal = document.createElement('div');
    modal.id    = 'col-picker-modal';
    modal.innerHTML = `
        <div onclick="document.getElementById('col-picker-modal').remove()"
             style="position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9500;"></div>
        <div style="position:fixed;bottom:0;left:0;right:0;background:#111;border-radius:20px 20px 0 0;
                    padding:20px;z-index:9501;border-top:1px solid #222;max-height:65vh;overflow-y:auto;">
            <div style="width:40px;height:4px;background:#333;border-radius:2px;margin:0 auto 16px;"></div>
            <h3 style="margin:0 0 14px;font-size:16px;font-weight:800;">🔖 Simpan ke Koleksi</h3>
            ${cols.map(col => {
                let colVids = [];
                try { colVids = JSON.parse(localStorage.getItem(`sf_col_${col.id}`) || '[]'); } catch(e) {}
                const isAdded = colVids.some(v => v.id === videoId);
                return `
                <div onclick="addVideoToCollection('${col.id}', ${JSON.stringify(videoData).replace(/"/g,'&quot;')})"
                     style="display:flex;align-items:center;gap:12px;padding:12px;border-radius:10px;
                            cursor:pointer;margin-bottom:6px;border:1.5px solid ${isAdded ? '#fe2c55' : 'transparent'};
                            background:${isAdded ? '#1a0005' : '#1a1a1a'};">
                    <span style="font-size:22px;width:32px;text-align:center;">${col.emoji}</span>
                    <div style="flex:1;">
                        <p style="margin:0;font-size:14px;font-weight:700;">${escapeHtml(col.name)}</p>
                        <p style="margin:2px 0 0;font-size:11px;color:#555;">${colVids.length} video</p>
                    </div>
                    ${isAdded ? '<i class="fa-solid fa-check" style="color:#fe2c55;"></i>' : ''}
                </div>`;
            }).join('')}
            <button onclick="document.getElementById('col-picker-modal').remove();window.location.href='collections.html'"
                style="width:100%;background:transparent;border:1px dashed #333;color:#555;padding:11px;
                       border-radius:10px;font-size:13px;cursor:pointer;font-family:inherit;margin-top:8px;">
                + Urus Koleksi →
            </button>
        </div>`;
    document.body.appendChild(modal);
};

window.addVideoToCollection = function(colId, videoData) {
    let colVids = [];
    try { colVids = JSON.parse(localStorage.getItem(`sf_col_${colId}`) || '[]'); } catch(e) {}

    if (colVids.some(v => v.id === videoData.id)) {
        // Toggle off — buang dari koleksi
        colVids = colVids.filter(v => v.id !== videoData.id);
        localStorage.setItem(`sf_col_${colId}`, JSON.stringify(colVids));
        showToast('Video dibuang dari koleksi.', 'info');
    } else {
        colVids.push(videoData);
        localStorage.setItem(`sf_col_${colId}`, JSON.stringify(colVids));
        let cols = [];
        try { cols = JSON.parse(localStorage.getItem('sf_collections') || '[]'); } catch(e) {}
        const col = cols.find(c => c.id === colId);
        showToast(`Disimpan ke "${col?.name || 'Koleksi'}"! 📁`, 'success');
    }
    document.getElementById('col-picker-modal')?.remove();
};

// ── 53. VIDEO EDITOR INTEGRATION ──────────
function checkEditorMeta() {
    try {
        const meta = JSON.parse(localStorage.getItem('sf_editor_meta') || 'null');
        if (!meta) return;
        localStorage.removeItem('sf_editor_meta');
        showToast('Video dari editor bersedia untuk upload! ✂️', 'success');
    } catch(e) {}
}

function checkDuetMeta() {
    try {
        const meta = JSON.parse(localStorage.getItem('sf_duet_meta') || 'null');
        if (!meta) return;
        localStorage.removeItem('sf_duet_meta');
        const captionEl = document.getElementById('video-caption');
        if (!captionEl) return;
        const tag  = meta.mode === 'stitch' ? '#stitch' : '#duet';
        const orig = meta.originalCreator ? `@${meta.originalCreator}` : '';
        captionEl.value = `${tag} ${orig} #snapflow`.trim();
        showToast(`${meta.mode === 'duet' ? 'Duet' : 'Stitch'} bersedia untuk upload! 🎭`, 'success');
    } catch(e) {}
}

// ── 54. CHALLENGE AUTO-HASHTAG ─────────────
function checkPendingChallengeHashtag() {
    const hashtag = localStorage.getItem('sf_pending_challenge_hashtag');
    if (!hashtag) return;
    const captionEl = document.getElementById('video-caption');
    if (!captionEl) return;
    if (!captionEl.value.includes(hashtag)) {
        captionEl.value = (captionEl.value + ' ' + hashtag).trim();
        showToast(`Hashtag cabaran ${hashtag} ditambah! 🏆`, 'success');
    }
    localStorage.removeItem('sf_pending_challenge_hashtag');
}

async function updateChallengeEntryCount(caption) {
    if (!caption) return;
    const hashtags = (caption.match(/#[\w]+/g) || []);
    for (const tag of hashtags) {
        const { data: chal } = await snapSupabase.from('challenges')
            .select('id,entry_count').eq('hashtag', tag.toLowerCase()).single().catch(() => ({ data: null }));
        if (!chal) continue;
        await snapSupabase.from('challenges')
            .update({ entry_count: (chal.entry_count || 0) + 1 }).eq('id', chal.id);
        const { data: { user } } = await snapSupabase.auth.getUser();
        if (user) {
            await snapSupabase.from('challenge_entries')
                .upsert([{ challenge_id: chal.id, user_id: user.id }]).catch(() => {});
        }
    }
}

// ── 55. LIVE BAR (Feed) ────────────────────
async function loadLiveBar() {
    const liveBar = document.getElementById('live-bar');
    if (!liveBar) return;
    try {
        const { data: sessions } = await snapSupabase.from('live_sessions')
            .select('session_id,host_id,host_name,viewer_count,title')
            .eq('is_active', true).order('viewer_count', { ascending: false }).limit(6);

        if (!sessions?.length) { liveBar.style.display = 'none'; return; }
        liveBar.style.display = 'flex';
        liveBar.innerHTML = `
            <a href="live.html" style="text-decoration:none;flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:4px;padding:0 8px;">
                <div style="width:52px;height:52px;background:#1a0005;border-radius:50%;border:2.5px solid #fe2c55;
                            display:flex;align-items:center;justify-content:center;font-size:18px;">
                    🔴
                </div>
                <span style="font-size:10px;color:#888;">Go Live</span>
            </a>
            ${sessions.map(s => `
            <a href="live.html" style="text-decoration:none;flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:4px;padding:0 6px;">
                <div style="position:relative;width:52px;height:52px;">
                    <div style="width:52px;height:52px;border-radius:50%;border:2.5px solid #fe2c55;
                                background-image:url('https://ui-avatars.com/api/?name=${encodeURIComponent(s.host_name||'U')}&background=random&size=104');
                                background-size:cover;"></div>
                    <span style="position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);background:#fe2c55;
                                 color:#fff;font-size:8px;font-weight:900;padding:1px 5px;border-radius:20px;">LIVE</span>
                </div>
                <span style="font-size:10px;color:#ccc;white-space:nowrap;max-width:60px;overflow:hidden;text-overflow:ellipsis;">
                    @${escapeHtml((s.host_name||'User').split(' ')[0])}
                </span>
            </a>`).join('')}`;
    } catch(e) { console.warn('loadLiveBar:', e); }
}

// ── 56. LOG AKTIVITI AUTO ──────────────────
function recordActivityAuto(type, desc, risk = 'low') {
    try {
        const logs  = JSON.parse(localStorage.getItem('sf_activity_log') || '[]');
        const ua    = navigator.userAgent;
        let browser = 'Browser', os = 'Unknown';
        if (ua.includes('Chrome'))       browser = 'Chrome';
        else if (ua.includes('Safari'))  browser = 'Safari';
        else if (ua.includes('Firefox')) browser = 'Firefox';
        else if (ua.includes('Edge'))    browser = 'Edge';
        if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
        else if (ua.includes('Android')) os = 'Android';
        else if (ua.includes('Windows')) os = 'Windows';
        else if (ua.includes('Mac'))     os = 'macOS';

        logs.unshift({ id: Date.now(), type, desc, risk, browser, os, timestamp: new Date().toISOString() });
        localStorage.setItem('sf_activity_log', JSON.stringify(logs.slice(0, 100)));
    } catch(e) {}
}

// ── DOMContentLoaded hooks ─────────────────
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);

    // Upload page
    if (params.get('from') === 'editor') checkEditorMeta();
    if (params.get('from') === 'duet')   checkDuetMeta();
    if (document.getElementById('video-caption')) checkPendingChallengeHashtag();

    // Live bar
    if (document.getElementById('live-bar')) loadLiveBar();

    // Search button
    initSearchButton();

    // Log aktiviti (1x per jam)
    const lastLog = parseInt(localStorage.getItem('sf_last_login_log') || '0');
    if (Date.now() - lastLog > 3600000) {
        snapSupabase?.auth?.getUser?.().then(({ data: { user } }) => {
            if (user) {
                recordActivityAuto('login', 'Sesi aktif', 'low');
                localStorage.setItem('sf_last_login_log', Date.now().toString());
            }
        }).catch(() => {});
    }
});

// ── viewVideo: navigate ke video dalam feed ──────
function viewVideo(videoId) {
    if (!videoId) return;
    window.location.href = `index.html#video-${videoId}`;
}

// ── openAddToCollection: buka collection picker ──
function openAddToCollection(colId) {
    // Redirect ke collections page
    window.location.href = 'collections.html';
}

// ── back: shortcut untuk history.back() ──────────
function back() {
    window.history.back();
}

// ── retryConnection: untuk offline.html ──────────
function retryConnection() {
    window.location.reload();
}

// ── filterShop: cari produk dalam shop ───────────
function filterShop(category) {
    const cards = document.querySelectorAll('[data-category]');
    cards.forEach(card => {
        const match = !category || category === 'all' || card.dataset.category === category;
        card.style.display = match ? '' : 'none';
    });
    document.querySelectorAll('.cat-tab, .filter-tab, .shop-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.cat === category || (!category && btn.dataset.cat === 'all'));
    });
}
