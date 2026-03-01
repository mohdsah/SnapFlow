// SnapFlow — DISCOVER Module
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
