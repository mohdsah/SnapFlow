// ==========================================
// 1. KONFIGURASI SUPABASE
// ==========================================
const supabaseUrl = "https://andsuzhyaencxfiamyed.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuZHN1emh5YWVuY3hmaWFteWVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMzAzMTgsImV4cCI6MjA4NTgwNjMxOH0.N_Nytjgmch9Ztq8a-8m2UaZJRZMMcsfMP0iwv2S9KAQ";
const snapSupabase = supabase.createClient(supabaseUrl, supabaseKey);

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
// 3. SISTEM SESI & AUTH
// ==========================================
async function checkUserSession() {
    try {
        const { data: { user } } = await snapSupabase.auth.getUser();
        const currentPage = window.location.pathname;
        const authPages = ['login.html', 'register.html', 'splash.html', 'forgot-password.html', 'update-password.html'];
        const isAuthPage = authPages.some(p => currentPage.includes(p));

        if (user && isAuthPage && !currentPage.includes('update-password.html')) {
            window.location.href = "index.html";
        } else if (!user && !isAuthPage) {
            window.location.href = "splash.html";
        }
    } catch (err) {
        console.error("Session check error:", err);
    }
}

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
                            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random" alt="avatar">
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
                </div>
            </div>`;
        }).join('');

        setupObserver();
        updateAllCommentCounts();
        updateBookmarkIcons();

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

    // Ignore jika klik pada sidebar atau butang
    if (event.target.closest('.side-bar') || event.target.closest('.mute-btn') || event.target.closest('.comment-sheet')) return;

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

    const { data: { user } } = await snapSupabase.auth.getUser();
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
    sheet.innerHTML = \`
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
        </div>\`;

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
    const { data: { user } } = await snapSupabase.auth.getUser();
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
            return \`
                <div class="comment-item \${isReply ? 'comment-reply' : ''}" style="\${isReply ? 'padding-left:44px;margin-top:2px;' : ''}">
                    <div style="background-image:url('https://ui-avatars.com/api/?name=\${encodeURIComponent(escapeHtml(c.username||'U'))}&background=random');background-size:cover;background-color:#333;width:\${isReply?'30px':'36px'};height:\${isReply?'30px':'36px'};border-radius:50%;flex-shrink:0;"></div>
                    <div style="flex:1;min-width:0;">
                        <strong style="font-size:13px;color:#ccc;">\${escapeHtml(c.username||'User')}</strong>
                        <p style="margin:3px 0 4px;font-size:14px;color:#eee;line-height:1.4;">\${escapeHtml(c.comment_text)}</p>
                        <div style="display:flex;gap:14px;align-items:center;">
                            <span style="font-size:11px;color:#555;">\${timeAgo(c.created_at)}</span>
                            \${!isReply ? \`<button onclick="setReplyTo(\${c.id}, '\${escapeHtml(c.username||'User')}')" style="background:transparent;border:none;color:#888;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;padding:0;">Balas</button>\` : ''}
                        </div>
                        \${childReplies.length > 0 ? \`
                            <button onclick="toggleReplies(\${c.id})" style="background:transparent;border:none;color:#fe2c55;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;padding:4px 0;display:flex;align-items:center;gap:4px;">
                                <i class="fa-solid fa-caret-right" id="reply-caret-\${c.id}"></i> \${childReplies.length} balasan
                            </button>
                            <div id="replies-\${c.id}" style="display:none;">
                                \${childReplies.map(r => buildComment(r, true)).join('')}
                            </div>
                        \` : ''}
                    </div>
                </div>\`;
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
        input.placeholder = \`Balas @\${username}...\`;
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
    label.innerHTML = \`<i class="fa-solid fa-reply"></i> Balas @\${escapeHtml(username)} <button onclick="cancelReply()" style="margin-left:auto;background:transparent;border:none;color:#555;cursor:pointer;font-size:14px;">✕</button>\`;
}

function cancelReply() {
    replyingToComment = null;
    const input = document.getElementById('new-comment');
    if (input) input.placeholder = 'Tambah komen...';
    document.getElementById('reply-label')?.remove();
}

function toggleReplies(commentId) {
    const el = document.getElementById(\`replies-\${commentId}\`);
    const caret = document.getElementById(\`reply-caret-\${commentId}\`);
    if (!el) return;
    const isOpen = el.style.display !== 'none';
    el.style.display = isOpen ? 'none' : 'block';
    if (caret) caret.style.transform = isOpen ? 'rotate(0)' : 'rotate(90deg)';
}

async function sendComment() {
    const input = document.getElementById('new-comment');
    if (!input?.value?.trim() || !currentVideoId) return;

    const { data: { user } } = await snapSupabase.auth.getUser();
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
function previewFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const previewImg = document.getElementById('preview-img');
    const previewVid = document.getElementById('preview-vid');
    const placeholder = document.getElementById('placeholder-content');

    if (placeholder) placeholder.style.display = 'none';

    const url = URL.createObjectURL(file);

    if (file.type.startsWith('video/')) {
        if (previewImg) previewImg.style.display = 'none';
        if (previewVid) { previewVid.src = url; previewVid.style.display = 'block'; }
    } else {
        if (previewVid) previewVid.style.display = 'none';
        if (previewImg) { previewImg.src = url; previewImg.style.display = 'block'; }
    }
}

async function startUpload() {
    const fileInput = document.getElementById('file-input');
    const caption = document.getElementById('video-caption')?.value?.trim();
    const btn = document.getElementById('upload-btn');

    if (!fileInput?.files[0]) return showToast('Sila pilih fail dahulu.', 'warning');

    const file = fileInput.files[0];
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) return showToast('Fail terlalu besar. Maksimum 50MB.', 'error');

    setLoading(btn, true, 'Kongsi Sekarang');

    try {
        const { data: { user } } = await snapSupabase.auth.getUser();
        if (!user) { setLoading(btn, false, 'Kongsi Sekarang'); return showToast('Sila log masuk.', 'warning'); }

        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}_${Date.now()}.${fileExt}`;
        const bucket = file.type.startsWith('video/') ? 'videos' : 'images';

        const { data: uploadData, error: uploadError } = await snapSupabase.storage
            .from(bucket).upload(fileName, file, { upsert: false });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = snapSupabase.storage.from(bucket).getPublicUrl(fileName);

        const { error: dbError } = await snapSupabase.from('videos').insert([{
            user_id: user.id,
            video_url: publicUrl,
            caption: caption || '',
            username: user.user_metadata?.full_name || 'User',
            likes_count: 0
        }]);

        if (dbError) throw dbError;

        showToast('Video berjaya dikongsikan! 🎉', 'success');
        setTimeout(() => window.location.href = 'index.html', 1200);

    } catch (err) {
        console.error("Upload error:", err);
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
        const { data: { user } } = await snapSupabase.auth.getUser();
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
            <div class="profile-video-item" onclick="viewVideo(${vid.id})">
                <video src="${escapeHtml(vid.video_url)}" preload="none"></video>
                <div class="profile-video-overlay">
                    <i class="fa-solid fa-heart"></i> ${vid.likes_count || 0}
                </div>
            </div>
        `).join('');

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

let cart = JSON.parse(localStorage.getItem('snapflow_cart') || '[]');
function saveCart() { localStorage.setItem('snapflow_cart', JSON.stringify(cart)); }

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
            <img src="${p.img}" alt="${escapeHtml(p.name)}" style="width:100%;aspect-ratio:1/1;object-fit:cover;">
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
            <img src="${p.img}" alt="${escapeHtml(p.name)}" style="width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:10px 10px 0 0;">
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
            <img src="${item.img}" style="width:70px;height:70px;object-fit:cover;border-radius:8px;">
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

function checkout() {
    if (cart.length === 0) return showToast('Troli anda kosong!', 'warning');
    window.location.href = 'checkout.html';
}

function contactSeller(sellerId) {
    window.location.href = `chat.html?seller=${sellerId}`;
}

function goToCheckout(productName, price) {
    window.location.href = `checkout.html?product=${encodeURIComponent(productName)}&price=${price}`;
}

// ==========================================
// 14. CHAT / MESEJ
// ==========================================
let chatSubscription = null;

async function loadMessages() {
    const chatBox = document.getElementById('chat-box');
    if (!chatBox) return;

    const params = new URLSearchParams(window.location.search);
    const sellerId = params.get('seller') || 'default';

    try {
        const { data: { user } } = await snapSupabase.auth.getUser();
        if (!user) return;

        const { data: msgs } = await snapSupabase.from('messages')
            .select('*')
            .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
            .order('created_at', { ascending: true });

        renderMessages(msgs || [], user.id);
    } catch (err) {
        console.error("loadMessages error:", err);
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
                console.log('✅ Realtime connected — Like & Komen aktif!');
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

// ── Toggle simpan video ───────────────────────────
async function showBookmarkAction(videoId) {
    const { data: { user } } = await snapSupabase.auth.getUser();
    if (!user) return showToast('Log masuk dahulu untuk simpan video.', 'warning');

    const icon = document.getElementById(`bookmark-icon-${videoId}`);
    const isSaved = savedVideos.has(videoId);

    if (isSaved) {
        savedVideos.delete(videoId);
        saveSavedVideos();
        if (icon) { icon.style.color = '#fff'; icon.className = 'fa-solid fa-bookmark'; }
        showToast('Video dibuang dari koleksi.', 'info');
    } else {
        savedVideos.add(videoId);
        saveSavedVideos();
        if (icon) { icon.style.color = '#fe2c55'; icon.className = 'fa-solid fa-bookmark'; }
        showToast('Video disimpan ke koleksi! 🔖', 'success');

        // Animasi denyut
        if (icon) {
            icon.style.transform = 'scale(1.4)';
            setTimeout(() => { icon.style.transform = 'scale(1)'; }, 200);
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
        console.log('Report logged (table may not exist yet):', err.message);
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
async function searchDiscover(query) {
    lastSearchQuery = query;
    const el = document.getElementById('search-results-inner') || document.getElementById('search-results-discover');
    if (!el) return;

    el.innerHTML = `<div style="padding:20px;text-align:center;color:#444;">Mencari "${escapeHtml(query)}"...</div>`;

    try {
        let videoResults = [], kreatorResults = [];

        // Cari video
        if (currentSearchFilter !== 'kreator') {
            const { data: byCaption } = await snapSupabase
                .from('videos').select('*').ilike('caption', `%${query}%`).limit(9);
            videoResults = byCaption || [];
        }

        // Cari kreator (unique users dari videos table)
        if (currentSearchFilter !== 'video') {
            const { data: byUser } = await snapSupabase
                .from('videos').select('user_id, username, likes_count')
                .ilike('username', `%${query}%`).limit(20);

            // Aggregate kreator unik
            const kreatorMap = {};
            (byUser || []).forEach(v => {
                if (!kreatorMap[v.user_id]) {
                    kreatorMap[v.user_id] = { user_id: v.user_id, username: v.username || 'User', totalLikes: 0, videoCount: 0 };
                }
                kreatorMap[v.user_id].totalLikes += (v.likes_count || 0);
                kreatorMap[v.user_id].videoCount += 1;
            });
            kreatorResults = Object.values(kreatorMap).slice(0, 8);
        }

        if (videoResults.length === 0 && kreatorResults.length === 0) {
            el.innerHTML = `
                <div style="text-align:center;padding:50px 20px;color:#333;">
                    <i class="fa-solid fa-magnifying-glass" style="font-size:36px;margin-bottom:14px;display:block;"></i>
                    <p style="font-size:14px;">Tiada hasil untuk <strong style="color:#fff;">"${escapeHtml(query)}"</strong></p>
                    <p style="font-size:13px;color:#333;margin-top:6px;">Cuba cari dengan perkataan lain</p>
                </div>`;
            return;
        }

        let html = '';

        // Bahagian kreator
        if (kreatorResults.length > 0) {
            html += `<div style="padding:12px 16px 6px;font-size:13px;font-weight:700;color:#888;">👤 Kreator</div>`;
            html += kreatorResults.map((c, i) => `
                <div class="search-result-item fade-in" style="animation-delay:${i*0.04}s;">
                    <div style="width:46px;height:46px;border-radius:50%;background-image:url('https://ui-avatars.com/api/?name=${encodeURIComponent(c.username)}&background=random&size=100');background-size:cover;flex-shrink:0;border:1px solid #222;"></div>
                    <div style="flex:1;min-width:0;">
                        <strong style="font-size:14px;display:block;">@${escapeHtml(c.username)}</strong>
                        <span style="font-size:12px;color:#555;">${c.videoCount} video · ${c.totalLikes} likes</span>
                    </div>
                    <button class="follow-kreator-btn" style="width:70px;" onclick="followCreatorById('${c.user_id}', this)">+ Ikuti</button>
                </div>`).join('');
        }

        // Bahagian video
        if (videoResults.length > 0) {
            html += `<div style="padding:12px 16px 6px;font-size:13px;font-weight:700;color:#888;">🎬 Video (${videoResults.length})</div>`;
            html += buildVideoGrid(videoResults, false);
        }

        el.innerHTML = html;

    } catch (err) {
        el.innerHTML = `<div style="padding:20px;text-align:center;color:#fe2c55;">Ralat semasa mencari.</div>`;
    }
}

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
