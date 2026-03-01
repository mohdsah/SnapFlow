// SnapFlow — FEED Module
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
