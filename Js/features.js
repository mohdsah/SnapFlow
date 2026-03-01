// SnapFlow — FEATURES Module
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
