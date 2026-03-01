// SnapFlow — CHAT Module
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
            console.log('[FCM] Notifikasi aktif untuk user:', user.id);
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
