// ==========================================
// 1. KONFIGURASI SUPABASE (Kekal Sama)
// ==========================================
const supabaseUrl = "https://andsuzhyaencxfiamyed.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuZHN1emh5YWVuY3hmaWFteWVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMzAzMTgsImV4cCI6MjA4NTgwNjMxOH0.N_Nytjgmch9Ztq8a-8m2UaZJRZMMcsfMP0iwv2S9KAQ"; 
const snapSupabase = supabase.createClient(supabaseUrl, supabaseKey);

// ==========================================
// 2. LOGIKA HALAMAN HOME (Kemas kini Fullscreen)
// ==========================================
async function loadHomeFeed() {
    const feedContainer = document.getElementById('video-feed');
    if (!feedContainer) return;

    const { data: videos } = await snapSupabase.from('videos').select('*').order('created_at', { ascending: false });
    
    if (videos) {
        feedContainer.innerHTML = videos.map(vid => `
            <div class="video-container">
                <video src="${vid.video_url}" loop playsinline onclick="this.paused ? this.play() : this.pause()"></video>
                
                <div class="side-bar">
                    <div class="action-item" onclick="handleLikeAction(${vid.id})">
                        <i class="fa-solid fa-heart" id="like-icon-${vid.id}"></i>
                        <span>${vid.likes_count || 0}</span>
                    </div>
                    <div class="action-item" onclick="toggleComments(${vid.id})">
                        <i class="fa-solid fa-comment-dots"></i>
                        <span>20</span>
                    </div>
                    <div class="action-item"><i class="fa-solid fa-share"></i><span>Kongsi</span></div>
                </div>

                <div class="video-info">
                    <h3>@mahbayuengineering</h3>
                    <p>${vid.caption || ''}</p>
                </div>
            </div>
        `).join('');
        setupObserver();
    }
}

// ==========================================
// 3. FUNGSI SEARCH (Baru ditambahkan)
// ==========================================
function toggleSearch() {
    const overlay = document.getElementById('search-overlay');
    if(!overlay) return;
    overlay.style.display = (overlay.style.display === 'block') ? 'none' : 'block';
    if (overlay.style.display === 'block') document.getElementById('search-input').focus();
}

async function handleSearch(event) {
    const query = event.target.value.trim();
    const resultsContainer = document.getElementById('search-results');
    if (query.length < 2) return;

    const { data: videos } = await snapSupabase
        .from('videos')
        .select('*')
        .ilike('caption', `%${query}%`); 

    if (videos && videos.length > 0) {
        resultsContainer.innerHTML = videos.map(vid => `
            <div class="search-item" onclick="toggleSearch()" style="display:flex; gap:10px; padding:10px; border-bottom:1px solid #222;">
                <div style="width:50px; height:50px; background:#333; border-radius:4px;"></div>
                <div>
                    <h4 style="margin:0; font-size:14px;">${vid.caption.substring(0,30)}...</h4>
                    <p style="margin:0; font-size:12px; color:#888;">Klik untuk lihat</p>
                </div>
            </div>
        `).join('');
    } else {
        resultsContainer.innerHTML = `<p style="text-align:center; color:#555;">Tiada hasil dijumpai.</p>`;
    }
}

// ==========================================
// 4. LOGIKA LAIN (Kekal Seperti Asal)
// ==========================================

// ... (Semua kod loadUserVideos, handleUpload, renderCart, renderCheckout, displayUserProfile anda yang ada di atas dikekalkan tanpa perubahan)

// Pastikan fungsi ini tetap berjalan
loadHomeFeed();
loadUserVideos();
checkUserSession();

// --- PENAMBAHAN PROSES PAYMENT KE DATABASE ---
async function processPayment() {
    const cart = JSON.parse(localStorage.getItem('snapflow_cart')) || [];
    const { data: { user } } = await snapSupabase.auth.getUser();

    if (cart.length > 0 && user) {
        // Simpan setiap barang dalam troli ke jadual 'orders'
        for (const item of cart) {
            await snapSupabase.from('orders').insert([
                { 
                    buyer_id: user.id, 
                    product_name: item.name, 
                    total_amount: parseInt(item.price.replace(/[^\d]/g, '')),
                    status: 'Sedang Diproses'
                }
            ]);
        }
    }

    alert("Bayaran Berjaya! Pesanan anda telah direkodkan.");
    localStorage.removeItem('snapflow_cart');
    window.location.href = "orders.html";
}

// ... (Seterusnya kekalkan semua fungsi pembantu lain yang anda hantar tadi)

// Fungsi Pendaftaran (Register) - DIPERBAIKI
async function handleRegister() {
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;

    // Validasi ringkas
    if (!username || !email || !password) {
        alert("Sila isi semua ruangan (Nama, Emel, dan Kata Laluan).");
        return;
    }

    if (password.length < 6) {
        alert("Kata laluan mestilah sekurang-kurangnya 6 aksara.");
        return;
    }

    // Tukar butang kepada mod memuatkan
    const regBtn = document.querySelector('button[onclick="handleRegister()"]');
    const originalText = regBtn.innerText;
    regBtn.innerText = "Mendaftar...";
    regBtn.disabled = true;

    try {
        // 1. Daftar pengguna dalam Supabase Auth dengan metadata
        const { data, error } = await snapSupabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: username, // Simpan nama penuh dalam metadata
                }
            }
        });

        if (error) throw error;

        if (data.user) {
            alert("Pendaftaran Berjaya! Sila log masuk.");
            window.location.href = "login.html";
        }
    } catch (error) {
        alert("Ralat Pendaftaran: " + error.message);
    } finally {
        // Pulihkan butang
        regBtn.innerText = originalText;
        regBtn.disabled = false;
    }
}
// Fungsi Pendaftaran (Register) - DIPERBAIKI
async function handleRegister() {
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;

    // Validasi ringkas
    if (!username || !email || !password) {
        alert("Sila isi semua ruangan (Nama, Emel, dan Kata Laluan).");
        return;
    }

    if (password.length < 6) {
        alert("Kata laluan mestilah sekurang-kurangnya 6 aksara.");
        return;
    }

    // Tukar butang kepada mod memuatkan
    const regBtn = document.querySelector('button[onclick="handleRegister()"]');
    const originalText = regBtn.innerText;
    regBtn.innerText = "Mendaftar...";
    regBtn.disabled = true;

    try {
        // 1. Daftar pengguna dalam Supabase Auth dengan metadata
        const { data, error } = await snapSupabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: username, // Simpan nama penuh dalam metadata
                }
            }
        });

        if (error) throw error;

        if (data.user) {
            alert("Pendaftaran Berjaya! Sila log masuk.");
            window.location.href = "login.html";
        }
    } catch (error) {
        alert("Ralat Pendaftaran: " + error.message);
    } finally {
        // Pulihkan butang
        regBtn.innerText = originalText;
        regBtn.disabled = false;
    }
}

// ==========================================
// FUNGSI LOG MASUK (Login) - DIPERBAIKI
// ==========================================
async function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const loginBtn = document.querySelector('.login-btn-main');

    // 1. Validasi Input
    if (!email || !password) {
        alert("Sila masukkan emel dan kata laluan.");
        return;
    }

    // 2. Tunjukkan status memuatkan (Loading)
    const originalText = loginBtn.innerText;
    loginBtn.innerText = "Sila tunggu...";
    loginBtn.disabled = true;

    try {
        // 3. Proses Log Masuk dengan Supabase
        const { data, error } = await snapSupabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) throw error;

        // 4. Jika berjaya
        if (data.user) {
            console.log("Log masuk berjaya:", data.user);
            window.location.href = "index.html"; // Terus ke Home
        }

    } catch (error) {
        // 5. Pengurusan Ralat (Contoh: Salah password atau emel)
        alert("Ralat Log Masuk: " + error.message);
    } finally {
        // 6. Pulihkan butang jika gagal
        loginBtn.innerText = originalText;
        loginBtn.disabled = false;
    }
}
