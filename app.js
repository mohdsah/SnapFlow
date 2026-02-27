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

async function loadHomeFeed() {
    const feedContainer = document.getElementById('video-feed');
    if (!feedContainer) return; // auto-resolves since async

    try {
        const { data: { user } } = await snapSupabase.auth.getUser();

        // Muatkan senarai video yang dah dilike oleh user
        if (user) {
            const { data: myLikes } = await snapSupabase.from('likes').select('video_id').eq('user_id', user.id);
            if (myLikes) myLikes.forEach(l => likedVideos.add(l.video_id));
        }

        const { data: videos, error } = await snapSupabase.from('videos').select('*').order('created_at', { ascending: false });

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

                    <div class="action-item" onclick="handleShare('${escapeHtml(vid.video_url)}')">
                        <i class="fa-solid fa-share" style="color:#fff;"></i>
                        <span>Kongsi</span>
                    </div>
                </div>

                <div class="video-info">
                    <h3>@${escapeHtml(username)}</h3>
                    <p>${escapeHtml(vid.caption || '')}</p>
                </div>
            </div>`;
        }).join('');

        setupObserver();
        updateAllCommentCounts();

    } catch (err) {
        console.error("loadHomeFeed error:", err);
        feedContainer.innerHTML = `<div style="height:100vh;display:flex;align-items:center;justify-content:center;color:#fe2c55;">Ralat memuatkan feed. Cuba lagi.</div>`;
    }
}

// ── State global untuk mute ─────────────────────
let isMuted = true; // Default muted (standard autoplay policy)

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

function handleShare(url) {
    if (navigator.share) {
        navigator.share({ title: 'SnapFlow Video', url: url });
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

async function loadComments(videoId) {
    const list = document.getElementById('comment-list');
    if (!list) return;
    list.innerHTML = '<p style="text-align:center;color:#555;padding:20px;">Memuatkan...</p>';

    try {
        const { data, error } = await snapSupabase.from('comments')
            .select('*').eq('video_id', videoId).order('created_at', { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
            list.innerHTML = '<p style="text-align:center;color:#444;margin-top:20px;padding:20px;">Belum ada komen. Jadilah yang pertama! 💬</p>';
        } else {
            list.innerHTML = data.map(c => `
                <div class="comment-item">
                    <div class="user-avatar" style="background-image: url('https://ui-avatars.com/api/?name=${encodeURIComponent(escapeHtml(c.username || 'U'))}&background=random'); background-size:cover; background-color:#333; width:36px; height:36px; border-radius:50%; flex-shrink:0;"></div>
                    <div class="comment-content" style="flex:1;">
                        <strong style="font-size:13px;color:#ccc;">${escapeHtml(c.username || 'User')}</strong>
                        <p style="margin:3px 0 0;font-size:14px;color:#eee;">${escapeHtml(c.comment_text)}</p>
                        <span style="font-size:11px;color:#555;">${timeAgo(c.created_at)}</span>
                    </div>
                </div>
            `).join('');
        }
    } catch (err) {
        list.innerHTML = '<p style="text-align:center;color:#fe2c55;padding:20px;">Ralat memuatkan komen.</p>';
    }
}

async function sendComment() {
    const input = document.getElementById('new-comment');
    if (!input?.value?.trim() || !currentVideoId) return;

    const { data: { user } } = await snapSupabase.auth.getUser();
    if (!user) return showToast('Log masuk dahulu.', 'warning');

    const commentText = input.value.trim();
    input.value = '';

    try {
        await snapSupabase.from('comments').insert([{
            video_id: currentVideoId,
            user_id: user.id,
            username: user.user_metadata?.full_name || 'User',
            comment_text: commentText
        }]);
        loadComments(currentVideoId);
        updateAllCommentCounts();

        // Update count di icon
        const el = document.getElementById(`comment-count-${currentVideoId}`);
        if (el) el.innerText = parseInt(el.innerText || 0) + 1;
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
            } else {
                video.pause();
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

    if (tab === 'trending') await renderTrending(contentEl);
    else if (tab === 'terbaru') await renderTerbaru(contentEl);
    else if (tab === 'kreator') await renderKreator(contentEl);
    else if (tab === 'hashtag') await renderHashtag(contentEl);
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
