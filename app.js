// ==========================================
// 1. KONFIGURASI SUPABASE
// ==========================================
const supabaseUrl = "https://andsuzhyaencxfiamyed.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuZHN1emh5YWVuY3hmaWFteWVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMzAzMTgsImV4cCI6MjA4NTgwNjMxOH0.N_Nytjgmch9Ztq8a-8m2UaZJRZMMcsfMP0iwv2S9KAQ"; 
const snapSupabase = supabase.createClient(supabaseUrl, supabaseKey);

// ==========================================
// 2. SISTEM SESI & SPLASH SCREEN
// ==========================================
async function checkUserSession() {
    const { data: { user } } = await snapSupabase.auth.getUser();
    const currentPage = window.location.pathname;

    if (user && (currentPage.includes('login.html') || currentPage.includes('register.html') || currentPage.includes('splash.html'))) {
        window.location.href = "index.html";
        return;
    }

    if (!user && !['login.html', 'register.html', 'splash.html'].some(page => currentPage.includes(page))) {
        window.location.href = "splash.html";
    }
}

// ==========================================
// 3. AUTHENTICATION (LOGIN & REGISTER)
// ==========================================
async function handleRegister() {
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const btn = document.querySelector('button[onclick="handleRegister()"]');

    if (!username || !email || !password) return alert("Sila isi semua ruangan.");
    btn.innerText = "Mendaftar...";
    btn.disabled = true;

    const { data, error } = await snapSupabase.auth.signUp({
        email: email,
        password: password,
        options: { data: { full_name: username } }
    });

    if (error) {
        alert("Ralat: " + error.message);
        btn.innerText = "Daftar";
        btn.disabled = false;
    } else {
        alert("Pendaftaran Berjaya! Sila log masuk.");
        window.location.href = "login.html";
    }
}

async function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn = document.querySelector('.login-btn-main');

    if (!email || !password) return alert("Sila isi email dan kata laluan.");
    
    btn.innerText = "Sila tunggu...";
    btn.disabled = true;

    const { data, error } = await snapSupabase.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        alert("Gagal: " + error.message);
        btn.innerText = "Log Masuk";
        btn.disabled = false;
    } else {
        window.location.href = "index.html";
    }
}

// ==========================================
// 4. VIDEO FEED & LIKE LOGIC
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
                    
                    <div class="action-item" style="position: relative; margin-bottom: 10px;">
                        <img src="https://ui-avatars.com/api/?name=Admin" style="width: 45px; height: 45px; border-radius: 50%; border: 2px solid #fff;">
                        <div style="position: absolute; bottom: -5px; left: 50%; transform: translateX(-50%); background: #fe2c55; border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; border: 2px solid #fff;">
                            <i class="fa-solid fa-plus" style="font-size: 10px; color: #fff;"></i>
                        </div>
                    </div>

                    <div class="action-item" onclick="handleLikeAction(${vid.id})" style="text-align: center;">
                        <i class="fa-solid fa-heart" id="like-icon-${vid.id}" style="font-size: 30px; color: #fff; filter: drop-shadow(0 0 2px rgba(0,0,0,0.5)); transition: color 0.3s;"></i>
                        <span id="like-count-${vid.id}" style="display: block; font-size: 12px; font-weight: bold; margin-top: 5px;">${vid.likes_count || 0}</span>
                    </div>

                    <div class="action-item" onclick="toggleComments(${vid.id})" style="text-align: center;">
                        <i class="fa-solid fa-comment-dots" style="font-size: 30px; color: #fff; filter: drop-shadow(0 0 2px rgba(0,0,0,0.5));"></i>
                        <span style="display: block; font-size: 12px; font-weight: bold; margin-top: 5px;">2,341</span>
                    </div>

                    <div class="action-item" style="text-align: center;">
                        <i class="fa-solid fa-bookmark" style="font-size: 30px; color: #fff; filter: drop-shadow(0 0 2px rgba(0,0,0,0.5));"></i>
                        <span style="display: block; font-size: 12px; font-weight: bold; margin-top: 5px;">23.1K</span>
                    </div>

                    <div class="action-item" style="text-align: center;">
                        <i class="fa-solid fa-share" style="font-size: 30px; color: #fff; filter: drop-shadow(0 0 2px rgba(0,0,0,0.5));"></i>
                        <span style="display: block; font-size: 12px; font-weight: bold; margin-top: 5px;">214.4K</span>
                    </div>

                    <div class="music-album" style="width: 40px; height: 40px; border-radius: 50%; background: #333; border: 8px solid #111; animation: rotation 3s infinite linear; margin-top: 10px;">
                         <img src="https://ui-avatars.com/api/?name=Music" style="width: 100%; height: 100%; border-radius: 50%;">
                    </div>
                </div>

                <div class="video-info" style="position: absolute; left: 15px; bottom: 100px; color: #fff; z-index: 10; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">
                    <h3 style="margin: 0; font-size: 16px;">@mahbayuengineering</h3>
                    <p style="margin: 5px 0; font-size: 14px;">${vid.caption || 'Projek Solar Power System #solar'}</p>
                </div>
            </div>
        `).join('');
        setupObserver();
    }
}

async function handleLikeAction(videoId) {
    const icon = document.getElementById(`like-icon-${videoId}`);
    const countElement = document.getElementById(`like-count-${videoId}`);
    if (!icon || !countElement) return;

    try {
        const { data: { user } } = await snapSupabase.auth.getUser();
        if (!user) return alert("Sila log masuk untuk Like!");

        const isLiked = icon.style.color === 'rgb(254, 44, 85)';

        if (!isLiked) {
            icon.style.color = '#fe2c55';
            countElement.innerText = parseInt(countElement.innerText) + 1;
            await snapSupabase.from('likes').insert([{ user_id: user.id, video_id: videoId }]);
            await snapSupabase.rpc('increment_likes', { row_id: videoId });
        } else {
            icon.style.color = '#fff';
            let current = parseInt(countElement.innerText);
            countElement.innerText = current > 0 ? current - 1 : 0;
            await snapSupabase.from('likes').delete().eq('user_id', user.id).eq('video_id', videoId);
            await snapSupabase.rpc('decrement_likes', { row_id: videoId });
        }
    } catch (error) {
        console.error("Ralat Like:", error);
    }
}

// ==========================================
// 5. UPLOAD LOGIC (IMAGE & VIDEO)
// ==========================================
function previewFile(event) {
    const file = event.target.files[0];
    const imgPreview = document.getElementById('preview-img');
    const vidPreview = document.getElementById('preview-vid');
    const placeholder = document.getElementById('placeholder-content');

    if (!file) return;
    if (placeholder) placeholder.style.display = 'none';

    if (file.type.startsWith('image/')) {
        if(imgPreview) { imgPreview.src = URL.createObjectURL(file); imgPreview.style.display = 'block'; }
        if(vidPreview) vidPreview.style.display = 'none';
    } else if (file.type.startsWith('video/')) {
        if(vidPreview) { vidPreview.src = URL.createObjectURL(file); vidPreview.style.display = 'block'; }
        if(imgPreview) imgPreview.style.display = 'none';
    }
}

async function startUpload() {
    const fileInput = document.getElementById('file-input');
    const file = fileInput ? fileInput.files[0] : null;
    const captionInput = document.getElementById('video-caption');
    const caption = captionInput ? captionInput.value.trim() : "";
    const btn = document.getElementById('upload-btn');

    if (!file) return alert("Sila pilih fail dahulu.");

    btn.innerText = "Memproses... ⏳";
    btn.disabled = true;

    try {
        const { data: { user } } = await snapSupabase.auth.getUser();
        if (!user) throw new Error("Sesi tamat. Sila log masuk.");

        const fileName = `${user.id}-${Date.now()}.${file.name.split('.').pop()}`;
        
        const { error: uploadError } = await snapSupabase.storage
            .from('videos')
            .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = snapSupabase.storage.from('videos').getPublicUrl(fileName);

        const { error: dbError } = await snapSupabase.from('videos').insert([{
            user_id: user.id,
            video_url: urlData.publicUrl,
            caption: caption,
            likes_count: 0
        }]);

        if (dbError) throw dbError;

        alert("Berjaya dikongsi!");
        window.location.href = "index.html";
    } catch (error) {
        alert("Gagal Muat Naik: " + error.message);
    } finally {
        btn.innerText = "Kongsi Sekarang";
        btn.disabled = false;
    }
}

// ==========================================
// 6. KOMEN & UTILITI
// ==========================================
function setupObserver() {
    const options = { threshold: 0.6 };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target.querySelector('video');
            if (entry.isIntersecting) { video.play(); } 
            else { video.pause(); }
        });
    }, options);
    document.querySelectorAll('.video-container').forEach(el => observer.observe(el));
}

let currentVideoId = null;
async function toggleComments(videoId) {
    const sheet = document.getElementById('comment-sheet');
    const overlay = document.getElementById('comment-overlay');
    if (!sheet) return;

    if (sheet.classList.contains('active')) {
        sheet.classList.remove('active');
        if(overlay) overlay.style.display = 'none';
        currentVideoId = null;
    } else {
        sheet.classList.add('active');
        if(overlay) overlay.style.display = 'block';
        currentVideoId = videoId;
        loadComments(videoId);
    }
}

async function loadComments(videoId) {
    const commentList = document.getElementById('comment-list');
    if(!commentList) return;
    commentList.innerHTML = '<p style="text-align:center; color:#555;">Memuatkan...</p>';

    const { data: comments } = await snapSupabase
        .from('comments')
        .select('*')
        .eq('video_id', videoId)
        .order('created_at', { ascending: false });

    if (!comments || comments.length === 0) {
        commentList.innerHTML = '<p style="text-align:center; color:#444; margin-top:20px;">Belum ada komen.</p>';
    } else {
        commentList.innerHTML = comments.map(c => `
            <div class="comment-item" style="display:flex; gap:10px; margin-bottom:15px;">
                <div class="user-avatar" style="width:30px; height:30px; border-radius:50%; background-image: url('https://ui-avatars.com/api/?name=${encodeURIComponent(c.username)}'); background-size:cover;"></div>
                <div class="comment-content">
                    <strong style="font-size:12px;">${c.username}</strong>
                    <p style="margin:0; font-size:14px;">${c.comment_text}</p>
                </div>
            </div>
        `).join('');
    }
}

async function sendComment() {
    const input = document.getElementById('new-comment');
    if(!input || !input.value.trim() || !currentVideoId) return;

    const { data: { user } } = await snapSupabase.auth.getUser();
    if (!user) return alert("Log masuk dahulu.");

    const { error } = await snapSupabase.from('comments').insert([{ 
        video_id: currentVideoId, 
        user_id: user.id, 
        username: user.user_metadata.full_name || "User",
        comment_text: input.value.trim() 
    }]);

    if (!error) { input.value = ''; loadComments(currentVideoId); }
}

async function handleLogout() {
    if (confirm("Log keluar?")) {
        await snapSupabase.auth.signOut();
        localStorage.clear();
        window.location.href = "splash.html";
    }
}

// Jalankan Fungsi
checkUserSession();
loadHomeFeed();
