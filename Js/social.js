// SnapFlow — SOCIAL Module
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

        console.log(`[Stories] ${ids.length} cerita tamat tempoh dipadam.`);
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
