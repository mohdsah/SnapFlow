// ==========================================
// 1. KONFIGURASI SUPABASE
// ==========================================
const supabaseUrl = "https://andsuzhyaencxfiamyed.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuZHN1emh5YWVuY3hmaWFteWVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMzAzMTgsImV4cCI6MjA4NTgwNjMxOH0.N_Nytjgmch9Ztq8a-8m2UaZJRZMMcsfMP0iwv2S9KAQ"; 
const snapSupabase = supabase.createClient(supabaseUrl, supabaseKey);

// ==========================================
// 2. SISTEM SESI & LOGIN
// ==========================================
async function checkUserSession() {
    const { data: { user } } = await snapSupabase.auth.getUser();
    const currentPage = window.location.pathname;
    if (user && (currentPage.includes('login.html') || currentPage.includes('register.html') || currentPage.includes('splash.html'))) {
        window.location.href = "index.html";
    } else if (!user && !['login.html', 'register.html', 'splash.html'].some(p => currentPage.includes(p))) {
        window.location.href = "splash.html";
    }
}

// ==========================================
// 3. VIDEO FEED (UPDATE: DYNAMIC BUTTONS)
// ==========================================
async function loadHomeFeed() {
    const feedContainer = document.getElementById('video-feed');
    if (!feedContainer) return;

    const { data: videos } = await snapSupabase.from('videos').select('*').order('created_at', { ascending: false });
    
    if (videos) {
        feedContainer.innerHTML = videos.map(vid => `
            <div class="video-container" style="position: relative; height: 100vh; scroll-snap-align: start;">
                <video src="${vid.video_url}" loop playsinline style="width: 100%; height: 100%; object-fit: cover;" onclick="this.paused ? this.play() : this.pause()"></video>
                
                <div class="side-bar" style="position: absolute; right: 10px; bottom: 100px; display: flex; flex-direction: column; align-items: center; gap: 20px; z-index: 10;">
                    
                    <div class="action-item" onclick="handleFollow('${vid.user_id}')" style="position: relative; margin-bottom: 10px;">
                        <img src="https://ui-avatars.com/api/?name=User" style="width: 45px; height: 45px; border-radius: 50%; border: 2px solid #fff;">
                        <div id="follow-btn-${vid.user_id}" style="position: absolute; bottom: -5px; left: 50%; transform: translateX(-50%); background: #fe2c55; border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; border: 2px solid #fff;">
                            <i class="fa-solid fa-plus" style="font-size: 10px; color: #fff;"></i>
                        </div>
                    </div>

                    <div class="action-item" onclick="handleLikeAction(${vid.id})" style="text-align: center;">
                        <i class="fa-solid fa-heart" id="like-icon-${vid.id}" style="font-size: 30px; color: #fff; filter: drop-shadow(0 0 2px rgba(0,0,0,0.5)); transition: 0.2s;"></i>
                        <span id="like-count-${vid.id}" style="display: block; font-size: 12px; font-weight: bold; margin-top: 5px;">${vid.likes_count || 0}</span>
                    </div>

                    <div class="action-item" onclick="toggleComments(${vid.id})" style="text-align: center;">
                        <i class="fa-solid fa-comment-dots" style="font-size: 30px; color: #fff; filter: drop-shadow(0 0 2px rgba(0,0,0,0.5));"></i>
                        <span id="comment-count-${vid.id}" style="display: block; font-size: 12px; font-weight: bold; margin-top: 5px;">0</span>
                    </div>

                    <div class="action-item" onclick="handleShare('${vid.video_url}')" style="text-align: center;">
                        <i class="fa-solid fa-share" style="font-size: 30px; color: #fff; filter: drop-shadow(0 0 2px rgba(0,0,0,0.5));"></i>
                        <span style="display: block; font-size: 12px; font-weight: bold; margin-top: 5px;">Share</span>
                    </div>
                </div>

                <div class="video-info" style="position: absolute; left: 15px; bottom: 100px; color: #fff; z-index: 10;">
                    <h3 style="margin: 0; font-size: 16px;">@User_${vid.user_id.substring(0,5)}</h3>
                    <p style="margin: 5px 0; font-size: 14px;">${vid.caption || ''}</p>
                </div>
            </div>
        `).join('');
        setupObserver();
        updateAllCommentCounts(); // Update jumlah komen setiap video
    }
}

// ==========================================
// 4. LOGIK BARU: FOLLOW & SHARE
// ==========================================
async function handleFollow(targetUserId) {
    const btn = document.getElementById(`follow-btn-${targetUserId}`);
    const { data: { user } } = await snapSupabase.auth.getUser();
    if (!user) return alert("Sila log masuk.");
    if (user.id === targetUserId) return alert("Anda tidak boleh follow diri sendiri.");

    // Animasi tukar butang (Optimistic)
    btn.style.background = "#2ecc71";
    btn.innerHTML = '<i class="fa-solid fa-check" style="font-size: 10px; color: #fff;"></i>';
    alert("Berjaya Follow!");
}

function handleShare(url) {
    if (navigator.share) {
        navigator.share({ title: 'SnapFlow Video', url: url });
    } else {
        navigator.clipboard.writeText(url);
        alert("Pautan disalin ke clipboard!");
    }
}

// ==========================================
// 5. LOGIK LIKE & KOMEN (FIXED)
// ==========================================
async function handleLikeAction(videoId) {
    const icon = document.getElementById(`like-icon-${videoId}`);
    const countSpan = document.getElementById(`like-count-${videoId}`);
    const { data: { user } } = await snapSupabase.auth.getUser();
    if (!user) return alert("Log masuk dahulu.");

    const isLiked = icon.style.color === 'rgb(254, 44, 85)';
    if (!isLiked) {
        icon.style.color = '#fe2c55';
        countSpan.innerText = parseInt(countSpan.innerText) + 1;
        await snapSupabase.from('likes').insert([{ user_id: user.id, video_id: videoId }]);
        await snapSupabase.rpc('increment_likes', { row_id: videoId });
    } else {
        icon.style.color = '#fff';
        countSpan.innerText = Math.max(0, parseInt(countSpan.innerText) - 1);
        await snapSupabase.from('likes').delete().eq('user_id', user.id).eq('video_id', videoId);
        await snapSupabase.rpc('decrement_likes', { row_id: videoId });
    }
}

async function updateAllCommentCounts() {
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
}

// ==========================================
// 6. SISTEM KOMEN (SLIDE UP)
// ==========================================
let currentVideoId = null;
async function toggleComments(videoId) {
    const sheet = document.getElementById('comment-sheet');
    const overlay = document.getElementById('comment-overlay');
    if (!sheet) return;

    if (sheet.classList.contains('active')) {
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
    list.innerHTML = '<p style="text-align:center; color:#555;">Memuatkan...</p>';
    const { data } = await snapSupabase.from('comments').select('*').eq('video_id', videoId).order('created_at', { ascending: false });
    
    if (!data || data.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:#444; margin-top:20px;">Belum ada komen.</p>';
    } else {
        list.innerHTML = data.map(c => `
            <div style="display:flex; gap:10px; margin-bottom:15px; padding: 0 10px;">
                <div style="width:35px; height:35px; border-radius:50%; background:#333; display:flex; align-items:center; justify-content:center; font-size:12px; color:#fff;">${c.username[0]}</div>
                <div>
                    <strong style="font-size:12px; color:#888;">${c.username}</strong>
                    <p style="margin:2px 0 0; font-size:14px; color:#eee;">${c.comment_text}</p>
                </div>
            </div>
        `).join('');
    }
}

async function sendComment() {
    const input = document.getElementById('new-comment');
    if (!input.value.trim() || !currentVideoId) return;
    const { data: { user } } = await snapSupabase.auth.getUser();
    if (!user) return alert("Log masuk dahulu.");

    await snapSupabase.from('comments').insert([{ 
        video_id: currentVideoId, 
        user_id: user.id, 
        username: user.user_metadata.full_name || "User",
        comment_text: input.value.trim() 
    }]);
    input.value = '';
    loadComments(currentVideoId);
    updateAllCommentCounts();
}

// Tambahkan observer dan inisialisasi sesi di akhir
function setupObserver() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target.querySelector('video');
            if (entry.isIntersecting) video.play(); else video.pause();
        });
    }, { threshold: 0.6 });
    document.querySelectorAll('.video-container').forEach(el => observer.observe(el));
}

checkUserSession();
loadHomeFeed();
// ==========================================
// FUNGSI UNTUK PROFILE
// ==========================================
async function loadProfileData() {
    const profileGrid = document.getElementById('profile-video-grid');
    const videoCountEl = document.getElementById('video-count');
    
    if (!profileGrid) return; // Jika bukan di page profile, abaikan

    try {
        const { data: { user } } = await snapSupabase.auth.getUser();
        if (!user) return;

        // Ambil data user (Username & Avatar)
        const usernameEl = document.getElementById('profile-username');
        if (usernameEl) usernameEl.innerText = `@${user.user_metadata.full_name || 'User'}`;

        // Ambil video milik user ini sahaja
        const { data: myVideos, error } = await snapSupabase
            .from('videos')
            .select('*')
            .eq('user_id', user.id) // Filter ikut user_id
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Update jumlah video
        if (videoCountEl) videoCountEl.innerText = myVideos.length;

        if (!myVideos || myVideos.length === 0) {
            profileGrid.innerHTML = '<p style="grid-column: span 3; text-align:center; color:#555; margin-top:50px;">Belum ada video dipos.</p>';
            return;
        }

        // Paparkan dalam grid (seperti TikTok)
        profileGrid.innerHTML = myVideos.map(vid => `
            <div class="profile-video-item" style="position: relative; aspect-ratio: 9/16; background: #111; overflow: hidden; border: 1px solid #000;">
                <video src="${vid.video_url}" style="width:100%; height:100%; object-fit:cover;"></video>
                <div style="position:absolute; bottom:5px; left:5px; color:#fff; font-size:12px; display:flex; align-items:center; gap:3px;">
                    <i class="fa-solid fa-play"></i> ${vid.likes_count || 0}
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error("Ralat Load Profile:", error);
    }
}

// Tambahkan panggil fungsi ini di bahagian bawah app.js
loadProfileData();
