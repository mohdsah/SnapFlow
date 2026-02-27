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
    if (!feedContainer) return;

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
            <div class="video-container" data-video-id="${vid.id}">
                <video src="${escapeHtml(vid.video_url)}" loop playsinline preload="none" onclick="togglePlayPause(this)"></video>

                <div class="video-gradient"></div>

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
                        <span>Share</span>
                    </div>
                </div>

                <div class="video-info">
                    <h3>@${escapeHtml(username)}</h3>
                    <p>${escapeHtml(vid.caption || '')}</p>
                </div>

                <div class="play-indicator" id="play-${vid.id}">
                    <i class="fa-solid fa-pause"></i>
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

function togglePlayPause(video) {
    video.paused ? video.play() : video.pause();
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
async function handleLikeAction(videoId) {
    const icon = document.getElementById(`like-icon-${videoId}`);
    const countSpan = document.getElementById(`like-count-${videoId}`);
    const { data: { user } } = await snapSupabase.auth.getUser();
    if (!user) return showToast('Log masuk dahulu.', 'warning');

    const isLiked = likedVideos.has(videoId);

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
                video.play().catch(() => {});
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
    { id: 1, name: 'Panel Jinko 550W', brand: 'Jinko', price: 1150, img: 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=400', desc: 'Panel solar monocrystalline 550W, jaminan 25 tahun.' },
    { id: 2, name: 'Hybrid Inverter 5kW', brand: 'Huawei', price: 3200, img: 'https://images.unsplash.com/photo-1613665813446-82a78c468a1d?w=400', desc: 'Inverter hybrid dengan MPPT dual channel.' },
    { id: 3, name: 'Panel Longi 445W', brand: 'Longi', price: 890, img: 'https://images.unsplash.com/photo-1569012871812-f38ee64cd54c?w=400', desc: 'Panel efisiensi tinggi teknologi Hi-MO 5.' },
    { id: 4, name: 'Panel Trina 550W', brand: 'Trina', price: 1050, img: 'https://images.unsplash.com/photo-1532601224476-15c79f2f7a51?w=400', desc: 'Vertex series dengan teknologi multi-busbar.' },
    { id: 5, name: 'Inverter Sungrow 8kW', brand: 'Sungrow', price: 4500, img: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=400', desc: 'Inverter string tiga fasa dengan monitoring pintar.' },
    { id: 6, name: 'Panel Jinko 450W', brand: 'Jinko', price: 950, img: 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=400', desc: 'Panel series Tiger Neo dengan efisiensi 22.3%.' },
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
// INISIALISASI
// ==========================================
checkUserSession();
loadHomeFeed();
loadProfileData();
loadShop();

// Tambah CSS untuk toast animation
const toastStyle = document.createElement('style');
toastStyle.innerText = `@keyframes toastIn { from { opacity:0; transform: translateX(-50%) translateY(20px); } to { opacity:1; transform: translateX(-50%) translateY(0); } }`;
document.head.appendChild(toastStyle);
