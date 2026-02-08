// ==========================================
// 1. KONFIGURASI SUPABASE
// ==========================================
const supabaseUrl = "https://andsuzhyaencxfiamyed.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuZHN1emh5YWVuY3hmaWFteWVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMzAzMTgsImV4cCI6MjA4NTgwNjMxOH0.N_Nytjgmch9Ztq8a-8m2UaZJRZMMcsfMP0iwv2S9KAQ"; 
const snapSupabase = supabase.createClient(supabaseUrl, supabaseKey);

// ==========================================
// 2. LOGIKA HALAMAN HOME (index.html)
// ==========================================
async function loadHomeFeed() {
    const feedContainer = document.getElementById('video-feed');
    if (!feedContainer) return; // Berhenti jika bukan di halaman index.html

    const { data: videos } = await snapSupabase.from('videos').select('*').order('created_at', { ascending: false });
    
    if (videos) {
        feedContainer.innerHTML = videos.map(vid => `
            <div class="video-card">
                <video src="${vid.video_url}" loop playsinline onclick="this.paused ? this.play() : this.pause()"></video>
                <div class="side-bar">
                    <div class="profile-btn" style="background-image: url('https://ui-avatars.com/api/?name=MB&background=random');"></div>
                    <div class="action-btn" onclick="likeVideo(${vid.id}, this)">
                        <i class="fa-solid fa-heart"></i>
                        <span>${vid.likes_count || 0}</span>
                    </div>
                    <div class="action-btn"><i class="fa-solid fa-comment-dots"></i><span>20</span></div>
                    <div class="action-btn"><i class="fa-solid fa-bookmark"></i><span>38</span></div>
                    <div class="action-btn"><i class="fa-solid fa-share"></i><span>23</span></div>
                </div>
                <div class="info-overlay" style="position:absolute; bottom:90px; left:15px;">
                    <h4>@mahbayuengineering</h4>
                    <p>${vid.caption || ''}</p>
                </div>
            </div>
        `).join('');
        setupObserver();
    }
}

// ==========================================
// 3. LOGIKA HALAMAN PROFILE (profile.html)
// ==========================================
async function loadUserVideos() {
    const grid = document.getElementById('user-video-grid');
    if (!grid) return; // Berhenti jika bukan di halaman profile.html

    const { data: videos } = await snapSupabase.from('videos').select('*').order('created_at', { ascending: false });
    if (videos) {
        grid.innerHTML = videos.map(vid => `
            <div class="grid-item">
                <video src="${vid.video_url}" style="width:100%; height:100%; object-fit:cover;"></video>
            </div>
        `).join('');
    }
}

// ==========================================
// 4. LOGIKA HALAMAN UPLOAD (upload.html)
// ==========================================
function previewVideo(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('video-preview-element');
    if (file && preview) {
        preview.src = URL.createObjectURL(file);
        preview.style.display = 'block';
        if(document.getElementById('upload-icon')) document.getElementById('upload-icon').style.display = 'none';
        if(document.getElementById('upload-text')) document.getElementById('upload-text').style.display = 'none';
    }
}

async function handleUpload() {
    const fileInput = document.getElementById('video-file');
    const captionInput = document.getElementById('video-caption');
    const btn = document.getElementById('btn-upload-submit');

    if (!fileInput || !fileInput.files[0]) return alert("Pilih video dulu!");

    const file = fileInput.files[0];
    btn.innerText = "Mengunggah...";
    btn.disabled = true;

    try {
        const fileName = `${Date.now()}_${file.name}`;
        const { error: uploadError } = await snapSupabase.storage.from('video-storage').upload(fileName, file);
        if (uploadError) throw uploadError;

        const { data: urlData } = snapSupabase.storage.from('video-storage').getPublicUrl(fileName);
        
        const { error: dbError } = await snapSupabase.from('videos').insert([
            { video_url: urlData.publicUrl, caption: captionInput.value, likes_count: 0 }
        ]);
        if (dbError) throw dbError;

        alert("Berhasil!");
        window.location.href = "index.html"; // Kembali ke Home setelah sukses
    } catch (error) {
        alert("Gagal: " + error.message);
    } finally {
        btn.innerText = "Posting Sekarang";
        btn.disabled = false;
    }
}

// ==========================================
// 5. FUNGSI PEMBANTU (Like & Observer)
// ==========================================
async function likeVideo(videoId, element) {
    const { data } = await snapSupabase.from('videos').select('likes_count').eq('id', videoId).single();
    const newCount = (data.likes_count || 0) + 1;
    await snapSupabase.from('videos').update({ likes_count: newCount }).eq('id', videoId);
    
    element.querySelector('span').innerText = newCount;
    element.querySelector('i').style.color = '#fe2c55';
}

function setupObserver() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target.querySelector('video');
            if (video) entry.isIntersecting ? video.play() : video.pause();
        });
    }, { threshold: 0.8 });
    document.querySelectorAll('.video-card').forEach(card => observer.observe(card));
}

// Jalankan fungsi sesuai halaman yang terbuka
loadHomeFeed();
loadUserVideos();

function goToDetail(name, price, img, desc) {
    // Bina URL dengan parameter supaya data boleh dibaca di halaman detail
    const url = `product-detail.html?name=${encodeURIComponent(name)}&price=${encodeURIComponent(price)}&img=${encodeURIComponent(img)}&desc=${encodeURIComponent(desc)}`;
    window.location.href = url;
}

// A. Fungsi Tambah ke Troli
function addToCart(name, price, img) {
    // Ambil data troli sedia ada atau buat baru jika kosong
    let cart = JSON.parse(localStorage.getItem('snapflow_cart')) || [];
    
    // Tambah item baru
    const newItem = { id: Date.now(), name, price, img };
    cart.push(newItem);
    
    // Simpan semula ke localStorage
    localStorage.setItem('snapflow_cart', JSON.stringify(cart));
    
    alert(`${name} telah ditambah ke troli!`);
    updateCartBadge();
}

// B. Fungsi Paparkan Barang dalam Cart Page
function renderCart() {
    const container = document.getElementById('cart-items-container');
    const cart = JSON.parse(localStorage.getItem('snapflow_cart')) || [];
    const countTitle = document.getElementById('cart-count-title');
    const totalDisplay = document.getElementById('total-price');

    if (cart.length === 0) {
        container.innerHTML = `<div style="text-align:center; margin-top:50px; color:#666;">Troli anda kosong.</div>`;
        return;
    }

    let total = 0;
    countTitle.innerText = cart.length;
    
    container.innerHTML = cart.map((item, index) => {
        // Tukar harga string "RM 8,500" ke nombor untuk pengiraan
        const priceValue = parseInt(item.price.replace(/[^\d]/g, ''));
        total += priceValue;

        return `
            <div class="cart-item" style="display: flex; gap: 15px; margin-bottom: 20px; background: #111; padding: 10px; border-radius: 8px;">
                <img src="${item.img}" style="width: 80px; height: 80px; border-radius: 8px; object-fit: cover;">
                <div style="flex: 1;">
                    <h4 style="margin: 0 0 5px 0; font-size: 14px;">${item.name}</h4>
                    <p style="color: #fe2c55; font-weight: bold; margin: 0;">${item.price}</p>
                    <button onclick="removeFromCart(${index})" style="background: none; border: none; color: #888; font-size: 12px; padding: 0; margin-top: 10px; cursor: pointer;">Hapus</button>
                </div>
            </div>
        `;
    }).join('');

    totalDisplay.innerText = `RM ${total.toLocaleString()}`;
}

// C. Fungsi Hapus Barang
function removeFromCart(index) {
    let cart = JSON.parse(localStorage.getItem('snapflow_cart')) || [];
    cart.splice(index, 1);
    localStorage.setItem('snapflow_cart', JSON.stringify(cart));
    renderCart(); // Refresh paparan
}

// D. Fungsi Checkout
function checkout() {
    alert("Pesanan anda telah diterima! Terima kasih kerana membeli di SnapFlow.");
    localStorage.removeItem('snapflow_cart');
    window.location.href = 'shop.html';
}

function renderCheckout() {
    const listContainer = document.getElementById('checkout-items-list');
    const cart = JSON.parse(localStorage.getItem('snapflow_cart')) || [];
    
    if (cart.length === 0) {
        window.location.href = 'shop.html';
        return;
    }

    let subtotal = 0;
    listContainer.innerHTML = cart.map(item => {
        const price = parseInt(item.price.replace(/[^\d]/g, ''));
        subtotal += price;
        return `
            <div style="display:flex; gap:10px; margin-bottom:10px; background:#1a1a1a; padding:10px; border-radius:8px;">
                <img src="${item.img}" style="width:50px; height:50px; border-radius:5px; object-fit:cover;">
                <div>
                    <div style="font-size:13px;">${item.name}</div>
                    <div style="color:var(--accent); font-weight:bold;">${item.price}</div>
                </div>
            </div>
        `;
    }).join('');

    const shipping = 15;
    const total = subtotal + shipping;

    document.getElementById('subtotal').innerText = `RM ${subtotal.toLocaleString()}`;
    document.getElementById('grand-total').innerText = `RM ${total.toLocaleString()}`;
    document.getElementById('footer-total').innerText = `RM ${total.toLocaleString()}`;
}

function processPayment() {
    // Di sini biasanya akan ada integrasi Payment Gateway
    // Untuk prototaip, kita terus ke halaman sukses
    localStorage.removeItem('snapflow_cart'); // Kosongkan troli
    window.location.href = 'order-success.html';
}

const allProducts = [
    { brand: 'Jinko', name: 'Jinko Tiger Neo N-Type', price: 'RM 1,200', img: 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=200' },
    { brand: 'Longi', name: 'Longi Hi-MO 5m', price: 'RM 1,150', img: 'https://images.unsplash.com/photo-1509391366360-fe5bb584850a?w=200' },
    { brand: 'Huawei', name: 'Huawei SUN2000 Inverter', price: 'RM 5,400', img: 'https://images.unsplash.com/photo-1548337138-e87d889cc369?w=200' },
    { brand: 'Jinko', name: 'Jinko Bifacial 550W', price: 'RM 1,450', img: 'https://images.unsplash.com/photo-1611288875055-1283d56af031?w=200' },
];

function filterBrand(brand, element) {
    // 1. Kemas kini gaya butang aktif
    document.querySelectorAll('.brand-item').forEach(item => item.classList.remove('active'));
    element.classList.add('active');

    // 2. Kemas kini nama tajuk
    document.getElementById('selected-brand-name').innerText = brand === 'All' ? 'Semua Produk' : 'Jenama: ' + brand;

    // 3. Tapis produk
    const filtered = brand === 'All' ? allProducts : allProducts.filter(p => p.brand === brand);
    
    const container = document.getElementById('filtered-product-list');
    container.innerHTML = filtered.map(p => `
        <div class="product-card" onclick="goToDetail('${p.name}', '${p.price}', '${p.img}', 'Produk kualiti tinggi dari ${p.brand}')">
            <div class="product-img" style="background-image: url('${p.img}');"></div>
            <div class="product-info">
                <p class="product-title" style="font-size:12px;">${p.name}</p>
                <p class="product-price" style="font-size:14px;">${p.price}</p>
            </div>
        </div>
    `).join('');
}

let currentVideoId = null;

// Fungsi Buka/Tutup Komen
function toggleComments(videoId = null) {
    const overlay = document.getElementById('comment-overlay');
    overlay.classList.toggle('active');
    
    if (videoId) {
        currentVideoId = videoId;
        loadComments(videoId);
    }
}

// Hubungkan butang komen di Video Card (Kemas kini loadHomeFeed anda)
// Tambahkan onclick="toggleComments(${vid.id})" pada ikon komen

async function loadComments(videoId) {
    const { data: comments, error } = await snapSupabase
        .from('comments')
        .select('*')
        .eq('video_id', videoId)
        .order('created_at', { ascending: false });

    const list = document.getElementById('comment-list');
    document.getElementById('comment-count').innerText = `${comments ? comments.length : 0} Komen`;
    
    if (comments) {
        list.innerHTML = comments.map(c => `
            <div class="comment-item">
                <img src="https://ui-avatars.com/api/?name=User&background=random" class="user-avatar-small">
                <div class="comment-text-box">
                    <div class="comment-user">Pengguna SnapFlow</div>
                    <div class="comment-msg">${c.comment_text}</div>
                </div>
            </div>
        `).join('');
    }
}

async function postComment() {
    const input = document.getElementById('input-comment');
    const text = input.value.trim();
    
    if (!text || !currentVideoId) return;

    const { error } = await snapSupabase
        .from('comments')
        .insert([{ video_id: currentVideoId, comment_text: text }]);

    if (!error) {
        input.value = '';
        loadComments(currentVideoId); // Refresh senarai komen
    } else {
        alert("Gagal menghantar komen.");
    }
}

async function loadNotifications() {
    const listContainer = document.getElementById('notification-list');
    if (!listContainer) return;

    // Data simulasi (bisa diganti dengan fetch dari Supabase 'notifications' table nanti)
    const notifications = [
        { user: 'Budi_Solar', action: 'menyukai video Anda', time: '2m', type: 'like', img: 'https://ui-avatars.com/api/?name=BS&background=random' },
        { user: 'Siti_Teknik', action: 'mengomentari: "Berapa harga panel ini?"', time: '15m', type: 'comment', img: 'https://ui-avatars.com/api/?name=ST&background=random' },
        { user: 'Andi_Eng', action: 'mulai mengikuti Anda', time: '1h', type: 'follow', img: 'https://ui-avatars.com/api/?name=AE&background=random' },
        { user: 'SnapFlow Official', action: 'Update: Fitur Shop baru telah tersedia!', time: '1d', type: 'system', img: 'https://ui-avatars.com/api/?name=SF&background=red' }
    ];

    listContainer.innerHTML += notifications.map(n => `
        <div class="notif-item">
            <img src="${n.img}" class="notif-avatar">
            <div class="notif-content">
                <span class="notif-user">${n.user}</span>
                <span class="notif-action">${n.action}</span>
                <span class="notif-time">${n.time}</span>
            </div>
            ${n.type === 'like' || n.type === 'comment' ? `<img src="https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=100" class="notif-preview">` : ''}
            ${n.type === 'follow' ? `<button style="background: #fe2c55; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-weight: bold; font-size: 12px;">Ikuti Balik</button>` : ''}
        </div>
    `).join('');
}

// A. Fungsi Log Masuk (Login)
async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const { data, error } = await snapSupabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        alert("Ralat Log Masuk: " + error.message);
    } else {
        alert("Selamat Kembali!");
        window.location.href = "index.html"; // Pergi ke Home
    }
}

// B. Semak jika pengguna sudah log masuk (Letakkan di atas app.js)
async function checkUserSession() {
    const { data: { user } } = await snapSupabase.auth.getUser();
    
    // Jika tiada user dan bukan di halaman login/register, hantar ke login.html
    const currentPage = window.location.pathname;
    if (!user && !currentPage.includes('login.html') && !currentPage.includes('register.html')) {
        window.location.href = "login.html";
    }
}

// C. Fungsi Log Keluar (Logout)
async function handleLogout() {
    await snapSupabase.auth.signOut();
    window.location.href = "login.html";
}

// Jalankan semakan sesi setiap kali halaman dimuat
checkUserSession();

// Fungsi Pendaftaran (Register)
async function handleRegister() {
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    if (!username || !email || !password) {
        alert("Sila isi semua ruangan.");
        return;
    }

    // 1. Daftar pengguna dalam Supabase Auth
    const { data, error } = await snapSupabase.auth.signUp({
        email: email,
        password: password,
        options: {
            data: {
                full_name: username,
            }
        }
    });

    if (error) {
        alert("Ralat Pendaftaran: " + error.message);
    } else {
        alert("Pendaftaran Berjaya! Sila semak emel anda untuk pengesahan (jika diaktifkan di Supabase).");
        window.location.href = "login.html";
    }
}

// Fungsi Lupa Kata Laluan (Reset Password)
async function handleResetPassword() {
    const email = document.getElementById('reset-email').value;

    if (!email) {
        alert("Sila masukkan alamat emel anda.");
        return;
    }

    const { data, error } = await snapSupabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/update-password.html',
    });

    if (error) {
        alert("Ralat: " + error.message);
    } else {
        alert("Pautan penetapan semula telah dihantar ke emel anda!");
        window.location.href = "login.html";
    }
}

async function displayUserProfile() {
    // 1. Ambil data sesi pengguna dari Supabase
    const { data: { user } } = await snapSupabase.auth.getUser();

    if (user) {
        // Ambil nama dari metadata yang kita simpan masa Register tadi
        const fullName = user.user_metadata.full_name || "Pengguna SnapFlow";
        const email = user.email;
        
        // Tampilkan di HTML
        document.getElementById('display-username').innerText = fullName;
        document.getElementById('display-handle').innerText = "@" + fullName.toLowerCase().replace(/\s+/g, '_');
        
        // Kemaskini avatar dengan nama user
        document.getElementById('profile-avatar').style.backgroundImage = `url('https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random')`;
    } else {
        // Jika tidak log masuk, hantar balik ke halaman login
        window.location.href = "login.html";
    }
}

// A. Buka/Tutup Modal
function toggleEditModal() {
    const modal = document.getElementById('edit-profile-modal');
    modal.style.display = (modal.style.display === 'block') ? 'none' : 'block';
    
    // Pra-isi data sedia ada
    if (modal.style.display === 'block') {
        document.getElementById('edit-name').value = document.getElementById('display-username').innerText;
        document.getElementById('edit-bio').value = document.querySelector('.profile-bio').innerText;
        document.getElementById('edit-preview-avatar').style.backgroundImage = document.getElementById('profile-avatar').style.backgroundImage;
    }
}

// B. Simpan Data ke Supabase
async function saveProfile() {
    const newName = document.getElementById('edit-name').value;
    const newBio = document.getElementById('edit-bio').value;

    const { data, error } = await snapSupabase.auth.updateUser({
        data: { 
            full_name: newName,
            bio: newBio 
        }
    });

    if (error) {
        alert("Gagal mengemaskini profil: " + error.message);
    } else {
        alert("Profil berjaya dikemaskini!");
        toggleEditModal();
        displayUserProfile(); // Refresh paparan profil
        
        // Kemaskini bio secara manual di UI
        document.querySelector('.profile-bio').innerText = newBio;
    }
}

// C. Kemas kini butang "Edit profile" di profile.html
// Pastikan anda menambah onclick="toggleEditModal()" pada butang .btn-edit

async function displayUserProfile() {
    const { data: { user } } = await snapSupabase.auth.getUser();
    
    if (user) {
        // 1. Papar Info Asas
        const fullName = user.user_metadata.full_name || "User SnapFlow";
        document.getElementById('display-username').innerText = fullName;
        document.getElementById('display-handle').innerText = "@" + fullName.toLowerCase().replace(/\s+/g, '_');
        document.getElementById('profile-avatar').style.backgroundImage = `url('https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random')`;

        // 2. Tarik Statistik Real-Time
        fetchRealTimeStats(user.id);
    } else {
        window.location.href = "login.html";
    }
}

async function fetchRealTimeStats(userId) {
    // A. Kira Following (Orang yang kita follow)
    const { count: followingCount } = await snapSupabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userId);

    // B. Kira Followers (Orang yang follow kita)
    const { count: followersCount } = await snapSupabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId);

    // C. Kira Likes (Jumlah Like pada semua video milik kita)
    // Nota: Ini memerlukan video kita mempunyai user_id yang betul
    const { data: userVideos } = await snapSupabase
        .from('videos')
        .select('id')
        .eq('user_id', userId);

    let totalLikes = 0;
    if (userVideos && userVideos.length > 0) {
        const videoIds = userVideos.map(v => v.id);
        const { count: likesCount } = await snapSupabase
            .from('likes')
            .select('*', { count: 'exact', head: true })
            .in('video_id', videoIds);
        totalLikes = likesCount || 0;
    }

    // 3. Masukkan angka ke dalam HTML
    document.getElementById('stat-following').innerText = followingCount || 0;
    document.getElementById('stat-followers').innerText = followersCount || 0;
    document.getElementById('stat-likes').innerText = totalLikes;
}
// Pantau perubahan pada jadual follows secara live
snapSupabase
    .channel('public:follows')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'follows' }, payload => {
        console.log('Perubahan dikesan!', payload);
        displayUserProfile(); // Refresh statistik secara automatik
    })
    .subscribe();

let targetUserId = "ID_PENGGUNA_YANG_DILIHAT"; // Contoh ID target

async function handleFollowAction() {
    // 1. Dapatkan ID pengguna yang sedang log masuk (Follower)
    const { data: { user } } = await snapSupabase.auth.getUser();
    
    if (!user) {
        alert("Sila log masuk untuk mengikuti pengguna ini.");
        return;
    }

    const followerId = user.id;
    const followingId = targetUserId; // ID orang yang kita nak follow

    // 2. Semak jika sudah follow atau belum
    const { data: existingFollow } = await snapSupabase
        .from('follows')
        .select('*')
        .eq('follower_id', followerId)
        .eq('following_id', followingId)
        .single();

    if (existingFollow) {
        // Jika sudah follow -> Unfollow (Hapus data)
        await snapSupabase
            .from('follows')
            .delete()
            .eq('follower_id', followerId)
            .eq('following_id', followingId);
        
        updateFollowButton(false);
    } else {
        // Jika belum follow -> Follow (Tambah data)
        await snapSupabase
            .from('follows')
            .insert([{ follower_id: followerId, following_id: followingId }]);
        
        updateFollowButton(true);
    }

    // 3. Refresh statistik real-time
    fetchRealTimeStats(followingId); 
}

// Fungsi untuk tukar rupa butang
function updateFollowButton(isFollowing) {
    const btn = document.getElementById('btn-follow');
    if (isFollowing) {
        btn.innerText = "Following";
        btn.classList.add('btn-followed');
    } else {
        btn.innerText = "Follow";
        btn.classList.remove('btn-followed');
    }
}

// Fungsi untuk aksi Like Video
async function handleLikeAction(videoId) {
    const { data: { user } } = await snapSupabase.auth.getUser();

    if (!user) {
        alert("Sila log masuk untuk menyukai video ini.");
        return;
    }

    // 1. Semak jika pengguna sudah like video ini sebelum ini
    const { data: existingLike } = await snapSupabase
        .from('likes')
        .select('*')
        .eq('user_id', user.id)
        .eq('video_id', videoId)
        .single();

    const likeIcon = document.getElementById(`like-icon-${videoId}`);

    if (existingLike) {
        // Jika sudah like -> Unlike (Hapus data)
        await snapSupabase
            .from('likes')
            .delete()
            .eq('user_id', user.id)
            .eq('video_id', videoId);
        
        likeIcon.style.color = "white"; // Tukar ikon jadi putih semula
    } else {
        // Jika belum like -> Like (Tambah data)
        await snapSupabase
            .from('likes')
            .insert([{ user_id: user.id, video_id: videoId }]);
        
        likeIcon.style.color = "#fe2c55"; // Tukar ikon jadi merah TikTok
    }

    // Nota: Statistik di Profil akan dikira secara automatik melalui fungsi fetchRealTimeStats yang kita buat sebelum ini.
}

// Gantilah receiverId dengan ID penjual yang dituju
const receiverId = 'ID_PENJUAL_TARGET'; 

async function sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    const { data: { user } } = await snapSupabase.auth.getUser();

    if (!message || !user) return;

    const { error } = await snapSupabase
        .from('messages')
        .insert([
            { sender_id: user.id, receiver_id: receiverId, content: message }
        ]);

    if (!error) {
        input.value = '';
        loadMessages(); // Muat ulang pesan
    }
}

async function loadMessages() {
    const { data: { user } } = await snapSupabase.auth.getUser();
    const chatBox = document.getElementById('chat-box');

    const { data: messages, error } = await snapSupabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

    if (messages) {
        chatBox.innerHTML = messages.map(msg => `
            <div class="msg-bubble ${msg.sender_id === user.id ? 'msg-me' : 'msg-them'}">
                ${msg.content}
                <span class="chat-time">${new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
        `).join('');
        chatBox.scrollTop = chatBox.scrollHeight;
    }
}

// Mendengarkan pesan baru secara REAL-TIME
function listenMessages() {
    snapSupabase
        .channel('public:messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
            loadMessages();
        })
        .subscribe();
}

// --- FUNGSI HUBUNGAN SHOP KE CHAT ---

function contactSeller(sellerId) {
    // 1. Simpan ID penjual dalam memori pelayar (LocalStorage)
    localStorage.setItem('currentChatPartner', sellerId);
    
    // 2. Buka halaman chat
    window.location.href = 'chat.html';
}

// Tambahkan ini juga supaya halaman Chat boleh muat mesej secara automatik
async function initChatPage() {
    const receiverId = localStorage.getItem('currentChatPartner');
    const chatInput = document.getElementById('chat-input');
    
    if (chatInput && receiverId) {
        console.log("Memulakan chat dengan:", receiverId);
        // Panggil fungsi muat mesej yang kita buat sebelum ini
        loadMessages(); 
        listenMessages();
    }
}

// Jalankan fungsi init jika berada di halaman chat
if (window.location.pathname.includes('chat.html')) {
    initChatPage();
}

// --- FUNGSI CHECKOUT ---

function processPayment() {
    // Simulasi proses bayaran
    alert("Memproses bayaran melalui FPX/Kad Kredit...");
    
    setTimeout(() => {
        alert("Bayaran Berjaya! Penjual akan dimaklumkan untuk penghantaran.");
        window.location.href = "index.html"; // Balik ke Home
    }, 2000);
}

// Fungsi untuk panggil checkout dari Chat (Contoh jika pembeli setuju harga)
function goToCheckout(itemName, itemPrice) {
    localStorage.setItem('checkoutItem', itemName);
    localStorage.setItem('checkoutPrice', itemPrice);
    window.location.href = 'checkout.html';
}

// Tambahkan ini untuk muat data dalam checkout.html
if (window.location.pathname.includes('checkout.html')) {
    const name = localStorage.getItem('checkoutItem') || "Produk Solar";
    const price = localStorage.getItem('checkoutPrice') || "0.00";
    
    document.getElementById('item-name').innerText = name;
    document.getElementById('item-price').innerText = `RM ${price}`;
    document.getElementById('subtotal').innerText = `RM ${price}`;
    
    // Kira total (Contoh tambah RM50 pos)
    const total = parseFloat(price.replace(',', '')) + 50;
    document.getElementById('total-price').innerText = `RM ${total.toFixed(2)}`;
    document.getElementById('bottom-total').innerText = `RM ${total.toFixed(2)}`;
}

// --- FUNGSI REKOD PESANAN ---

async function loadMyOrders() {
    const { data: { user } } = await snapSupabase.auth.getUser();
    if (!user) return;

    const { data: orders, error } = await snapSupabase
        .from('orders')
        .select('*')
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });

    const ordersContainer = document.getElementById('orders-list');

    if (orders && orders.length > 0) {
        ordersContainer.innerHTML = orders.map(order => `
            <div style="background: #111; border-radius: 12px; padding: 15px; margin-bottom: 15px; border: 1px solid #222;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 12px;">
                    <span style="color: #888;">ID: ${order.id.toString().substring(0,8).toUpperCase()}</span>
                    <span style="color: #fe2c55; font-weight: bold;">${order.status || 'Berjaya'}</span>
                </div>
                <div style="display: flex; gap: 15px; align-items: center;">
                    <div style="width: 60px; height: 60px; background: #222; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                        <i class="fa-solid fa-box" style="color: #555;"></i>
                    </div>
                    <div style="flex: 1;">
                        <h4 style="font-size: 14px; margin: 0;">${order.product_name}</h4>
                        <p style="font-size: 12px; color: #888; margin-top: 4px;">Kuantiti: 1</p>
                    </div>
                </div>
                <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #222; display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 12px; color: #888;">Jumlah Bayaran:</span>
                    <strong style="color: #fff;">RM ${order.total_amount}</strong>
                </div>
            </div>
        `).join('');
    } else {
        ordersContainer.innerHTML = `
            <div style="text-align: center; margin-top: 50px; color: #555;">
                <i class="fa-solid fa-receipt" style="font-size: 40px; margin-bottom: 10px;"></i>
                <p>Tiada rekod pesanan lagi.</p>
            </div>
        `;
    }
}

async function displayUserProfile() {
    // Ambil data orang yang tengah log masuk
    const { data: { user } } = await snapSupabase.auth.getUser();

    if (user) {
        // Ambil nama dari akaun
        const fullName = user.user_metadata.full_name || "User Baru";
        
        // Letakkan nama di skrin
        document.getElementById('display-username').innerText = fullName;
        document.getElementById('display-handle').innerText = "@" + fullName.toLowerCase().replace(/\s+/g, '');
        
        // Letakkan gambar (Avatar automatik)
        document.getElementById('profile-avatar').style.backgroundImage = `url('https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random')`;
        
        // Panggil fungsi kira statistik (Followers/Likes)
        fetchRealTimeStats(user.id);
    }
}
