// SnapFlow — PROFILE Module
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
