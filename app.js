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
// 4. VIDEO FEED & SEARCH
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
                        <i class="fa-solid fa-heart" id="like-icon-${vid.id}" style="font-size: 30px; color: #fff; filter: drop-shadow(0 0 2px rgba(0,0,0,0.5));"></i>
                        <span style="display: block; font-size: 12px; font-weight: bold; margin-top: 5px;">${vid.likes_count || '293.6K'}</span>
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


function setupObserver() {
    // Fungsi pembantu untuk video autoplay semasa skrol
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

function handleLikeAction(id) {
    console.log("Video Liked:", id);
    // Tambah logik update likes di sini jika perlu
}

function toggleSearch() {
    const overlay = document.getElementById('search-overlay');
    if(overlay) overlay.style.display = (overlay.style.display === 'block') ? 'none' : 'block';
}

// ==========================================
// 5. MARKETPLACE & PROFILE
// ==========================================
async function processPayment() {
    const cart = JSON.parse(localStorage.getItem('snapflow_cart')) || [];
    const { data: { user } } = await snapSupabase.auth.getUser();

    if (cart.length > 0 && user) {
        for (const item of cart) {
            await snapSupabase.from('orders').insert([{ 
                buyer_id: user.id, 
                product_name: item.name, 
                total_amount: parseInt(item.price.toString().replace(/[^\d]/g, '')),
                status: 'Sedang Diproses'
            }]);
        }
        alert("Bayaran Berjaya!");
        localStorage.removeItem('snapflow_cart');
        window.location.href = "orders.html";
    }
}

// --- SISTEM KOMEN (SLIDE UP) ---
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
    commentList.innerHTML = '<p style="text-align:center; color:#555;">Memuatkan komen...</p>';

    const { data: comments, error } = await snapSupabase
        .from('comments')
        .select('*')
        .eq('video_id', videoId)
        .order('created_at', { ascending: false });

    if (error) {
        commentList.innerHTML = '<p>Gagal memuatkan komen.</p>';
        return;
    }

    if (comments.length === 0) {
        commentList.innerHTML = '<p style="text-align:center; color:#444; margin-top:20px;">Belum ada komen.</p>';
    } else {
        commentList.innerHTML = comments.map(c => `
            <div class="comment-item" style="display:flex; gap:10px; margin-bottom:15px;">
                <div class="user-avatar" style="width:30px; height:30px; border-radius:50%; background-image: url('https://ui-avatars.com/api/?name=${encodeURIComponent(c.username)}&background=random'); background-size:cover;"></div>
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
    if(!input) return;
    const commentText = input.value.trim();
    if (!commentText || !currentVideoId) return;

    const { data: { user } } = await snapSupabase.auth.getUser();
    if (!user) return alert("Sila log masuk.");

    const { error } = await snapSupabase.from('comments').insert([{ 
        video_id: currentVideoId, 
        user_id: user.id, 
        username: user.user_metadata.full_name || "User",
        comment_text: commentText 
    }]);

    if (!error) {
        input.value = '';
        loadComments(currentVideoId);
    }
}

async function saveProfileChanges() {
    const newName = document.getElementById('edit-fullname').value.trim();
    const btn = document.getElementById('save-btn');
    if (!newName) return alert("Nama kosong.");

    btn.innerText = "Menyimpan...";
    btn.disabled = true;

    const { error } = await snapSupabase.auth.updateUser({ data: { full_name: newName } });

    if (!error) {
        alert("Berjaya!");
        window.location.href = "profile.html";
    } else {
        alert("Ralat: " + error.message);
        btn.innerText = "Simpan Perubahan";
        btn.disabled = false;
    }
}

// --- PULL TO REFRESH & LOGOUT ---
let touchStartY = 0;
const feed = document.getElementById('video-feed');
if (feed) {
    feed.addEventListener('touchstart', e => { touchStartY = e.touches[0].clientY; });
    feed.addEventListener('touchend', e => {
        const touchEndY = e.changedTouches[0].clientY;
        if (touchEndY - touchStartY > 150 && feed.scrollTop === 0) {
            alert("Refreshing...");
            loadHomeFeed();
        }
    });
}

async function handleLogout() {
    if (confirm("Log keluar?")) {
        const { error } = await snapSupabase.auth.signOut();
        if (!error) {
            localStorage.clear();
            window.location.href = "splash.html";
        }
    }
}

// Jalankan Fungsi
checkUserSession();
loadHomeFeed();

// ==========================================
// FUNGSI MUAT NAIK VIDEO (Upload)
// ==========================================
async function handleUpload() {
    const videoFile = document.getElementById('video-input').files[0];
    const caption = document.getElementById('video-caption').value.trim();
    const btn = document.getElementById('upload-btn');

    if (!videoFile) return alert("Sila pilih video dahulu.");
    
    btn.innerText = "Sedang Memuat Naik...";
    btn.disabled = true;

    try {
        const { data: { user } } = await snapSupabase.auth.getUser();
        if (!user) throw new Error("Sila log masuk terlebih dahulu.");

        // 1. Muat naik ke Supabase Storage (Bucket: 'videos')
        const fileName = `${user.id}-${Date.now()}.mp4`;
        const { data: uploadData, error: uploadError } = await snapSupabase.storage
            .from('videos')
            .upload(fileName, videoFile);

        if (uploadError) throw uploadError;

        // 2. Dapatkan URL video yang dimuat naik
        const { data: urlData } = snapSupabase.storage.from('videos').getPublicUrl(fileName);

        // 3. Simpan maklumat video ke database
        const { error: dbError } = await snapSupabase.from('videos').insert([{
            user_id: user.id,
            video_url: urlData.publicUrl,
            caption: caption,
            likes_count: 0
        }]);

        if (dbError) throw dbError;

        alert("Video Berjaya Dikongsi!");
        window.location.href = "index.html";

    } catch (error) {
        alert("Gagal: " + error.message);
    } finally {
        btn.innerText = "Kongsi Sekarang";
        btn.disabled = false;
    }
}
