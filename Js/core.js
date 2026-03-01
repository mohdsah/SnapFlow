// SnapFlow — CORE Module
// 1. KONFIGURASI SUPABASE
// ==========================================
const supabaseUrl = "https://trrfsredzugdyppevcbw.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRycmZzcmVkenVnZHlwcGV2Y2J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMzY5NTgsImV4cCI6MjA4NzgxMjk1OH0.o2siKHUQddz89mVBto0vEk9lIUZF5xYvp8eKBbXcc7s";
const snapSupabase = supabase.createClient(supabaseUrl, supabaseKey);

// ── Dev mode: tukar ke false sebelum production deploy ──
const DEV_MODE = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const devLog   = (...args) => { if (DEV_MODE) console.log('[SnapFlow]', ...args); };
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
// 3. SISTEM SESI & AUTH — SECURE
// ==========================================

// Pages yang TIDAK perlukan login
const AUTH_PAGES     = ['login.html','register.html','splash.html','forgot-password.html','update-password.html'];
// Pages yang langsung skip semua auth check
const SKIP_AUTH_PAGES = ['offline.html','404.html'];
// Pages semi-public (boleh tengok tapi features terhad tanpa login)
const SEMI_PUBLIC     = ['discover.html','search.html','profile.html'];

// State cache supaya tidak query Supabase berulang kali
let _authUser    = undefined; // undefined = belum check, null = tidak login
let _authChecked = false;

// ── Fungsi utama: dapatkan user (cached) ─────────
async function getAuthUser(forceRefresh = false) {
    if (_authChecked && !forceRefresh) return _authUser;
    try {
        const { data: { session } } = await snapSupabase.auth.getSession();
        _authUser    = session?.user || null;
        _authChecked = true;
        // Cache user ID untuk fungsi lain
        if (_authUser) _cachedUserId = _authUser.id;
        return _authUser;
    } catch (err) {
        console.error('[Auth] getAuthUser error:', err);
        _authUser = null;
        return null;
    }
}

// ── Guard utama: panggil di setiap protected page ─
async function requireAuth(redirectTo = 'splash.html') {
    const user = await getAuthUser();
    if (!user) {
        window.location.replace(redirectTo);
        return null;
    }
    return user;
}

// ── Guard admin: check role dari DB ────────────────
async function requireAdmin() {
    const user = await requireAuth();
    if (!user) return null;

    const { data: profile, error } = await snapSupabase
        .from('profiles')
        .select('role, is_admin')
        .eq('id', user.id)
        .single();

    if (error || (!profile?.is_admin && profile?.role !== 'admin')) {
        showToast('Akses dinafikan. Halaman ini hanya untuk admin.', 'error');
        setTimeout(() => window.location.replace('index.html'), 1500);
        return null;
    }
    return { user, profile };
}

// ── checkUserSession: panggil bila DOMContentLoaded ─
async function checkUserSession() {
    const currentPage = window.location.pathname;
    const page        = currentPage.split('/').pop() || 'index.html';

    // Skip pages tertentu
    if (SKIP_AUTH_PAGES.some(p => page.includes(p))) return;

    const isAuthPage   = AUTH_PAGES.some(p => page.includes(p));
    const isSemiPublic = SEMI_PUBLIC.some(p => page.includes(p));

    const user = await getAuthUser();

    // Redirect user yang dah login keluar dari auth pages
    if (user && isAuthPage && !page.includes('update-password')) {
        window.location.replace('index.html');
        return;
    }

    // Redirect ke splash jika tidak login (kecuali semi-public pages)
    if (!user && !isAuthPage && !isSemiPublic) {
        // Simpan URL asal untuk redirect balik selepas login
        sessionStorage.setItem('sf_redirect_after_login', window.location.href);
        window.location.replace('splash.html');
        return;
    }
}

// ── Auto refresh token & handle sign out ──────────
snapSupabase.auth.onAuthStateChange((event, session) => {
    const page = window.location.pathname.split('/').pop() || 'index.html';
    const isAuthPage   = AUTH_PAGES.some(p => page.includes(p));
    const isSkipPage   = SKIP_AUTH_PAGES.some(p => page.includes(p));
    const isSemiPublic = SEMI_PUBLIC.some(p => page.includes(p));

    if (isSkipPage) return;

    // Update cache
    _authUser    = session?.user || null;
    _authChecked = true;
    if (_authUser) _cachedUserId = _authUser.id;

    if (event === 'SIGNED_IN' && isAuthPage) {
        // Redirect balik ke page asal atau index
        const redirect = sessionStorage.getItem('sf_redirect_after_login');
        sessionStorage.removeItem('sf_redirect_after_login');
        window.location.replace(redirect && !AUTH_PAGES.some(p => redirect.includes(p)) ? redirect : 'index.html');
    }

    if (event === 'SIGNED_OUT' && !isAuthPage && !isSemiPublic) {
        window.location.replace('splash.html');
    }

    if (event === 'TOKEN_REFRESHED') {
        // Token refreshed silently — no action needed
    }

    if (event === 'USER_UPDATED') {
        // Refresh cached user data
        getAuthUser(true);
    }
});

// ✅ BARU: Handle Login
async function handleLogin() {
    const emailEl = document.getElementById('login-email');
    const passEl = document.getElementById('login-password');
    const btn = document.querySelector('.login-btn-main');

    const email = emailEl?.value?.trim();
    const password = passEl?.value?.trim();

    if (!email || !password) return showToast('Sila isi semua ruangan.', 'warning');

    setLoading(btn, true, 'Log Masuk');

    const { error } = await snapSupabase.auth.signInWithPassword({ email, password });
    if (error) {
        showToast('Email atau kata laluan salah.', 'error');
        setLoading(btn, false, 'Log Masuk');
    } else {
        showToast('Berjaya log masuk! 🎉', 'success');
        setTimeout(() => window.location.href = 'index.html', 800);
    }
}

// ✅ BARU: Handle Register
async function handleRegister() {
    const name = document.getElementById('reg-username')?.value?.trim();
    const email = document.getElementById('reg-email')?.value?.trim();
    const password = document.getElementById('reg-password')?.value?.trim();
    const btn = document.querySelector('button[onclick="handleRegister()"]');

    if (!name || !email || !password) return showToast('Sila isi semua ruangan.', 'warning');
    if (password.length < 6) return showToast('Kata laluan minimum 6 aksara.', 'warning');

    setLoading(btn, true, 'Daftar Sekarang');

    const { error } = await snapSupabase.auth.signUp({
        email, password,
        options: { data: { full_name: name } }
    });

    if (error) {
        showToast(error.message, 'error');
        setLoading(btn, false, 'Daftar Sekarang');
    } else {
        showToast('Akaun berjaya dicipta! Sila semak emel anda.', 'success');
        setTimeout(() => window.location.href = 'login.html', 2000);
    }
}

// ✅ BARU: Handle Logout
async function handleLogout() {
    if (!confirm('Anda pasti mahu log keluar?')) return;
    await snapSupabase.auth.signOut();
    window.location.href = 'splash.html';
}

// ✅ BARU: Handle Reset Password
async function handleResetPassword() {
    const email = document.getElementById('reset-email')?.value?.trim();
    const btn = document.querySelector('.login-btn-main');

    if (!email) return showToast('Sila masukkan emel anda.', 'warning');
    setLoading(btn, true, 'Hantar Pautan');

    const { error } = await snapSupabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/update-password.html'
    });

    if (error) {
        showToast('Ralat: ' + error.message, 'error');
    } else {
        showToast('Pautan reset telah dihantar ke emel anda!', 'success');
    }
    setLoading(btn, false, 'Hantar Pautan');
}

// ✅ BARU: Update Password
async function updateUserPassword() {
    const newPassword = document.getElementById('new-password')?.value?.trim();
    const btn = document.querySelector('button[onclick="updateUserPassword()"]');

    if (!newPassword || newPassword.length < 6) return showToast('Kata laluan minimum 6 aksara.', 'warning');
    setLoading(btn, true, 'Kemaskini');

    const { error } = await snapSupabase.auth.updateUser({ password: newPassword });
    if (error) {
        showToast('Ralat: ' + error.message, 'error');
        setLoading(btn, false, 'Kemaskini Kata Laluan');
    } else {
        showToast('Kata laluan berjaya dikemaskini!', 'success');
        setTimeout(() => window.location.href = 'login.html', 1200);
    }
}

// ==========================================
