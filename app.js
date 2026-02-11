// ==========================================
// 1. KONFIGURASI SUPABASE
// ==========================================
const supabaseUrl = "https://andsuzhyaencxfiamyed.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuZHN1emh5YWVuY3hmaWFteWVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMzAzMTgsImV4cCI6MjA4NTgwNjMxOH0.N_Nytjgmch9Ztq8a-8m2UaZJRZMMcsfMP0iwv2S9KAQ"; 
const snapSupabase = supabase.createClient(supabaseUrl, supabaseKey);

// ==========================================
// 2. SISTEM SESI & NAVIGATION
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
// 3. FUNGSI LIKE (DENGAN WARNA & RPC)
// ==========================================
async function handleLikeAction(videoId) {
    const icon = document.getElementById(`like-icon-${videoId}`);
    const countElement = document.getElementById(`like-count-${videoId}`);
    if (!icon || !countElement) return;

    try {
        const { data: { user } } = await snapSupabase.auth.getUser();
        if (!user) return alert("Sila log masuk untuk Like!");

        // Browser membaca warna hex sebagai RGB
        const isCurrentlyLiked = icon.style.color === 'rgb(254, 44, 85)';

        if (!isCurrentlyLiked) {
            // UI Update Terus (Laju)
            icon.style.color = '#fe2c55'; 
            countElement.innerText = parseInt(countElement.innerText) + 1;

            await snapSupabase.from('likes').insert([{ user_id: user.id, video_id: videoId }]);
            await snapSupabase.rpc('increment_likes', { row_id: videoId });
        } else {
            // UI Update (Unlike)
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
// 4. FUNGSI MUAT NAIK (STABIL)
// ==========================================
function previewFile(event) {
    const file = event.target.files[0];
    const imgPreview = document.getElementById('preview-img');
    const vidPreview = document.getElementById('preview-vid');
    const placeholder = document.getElementById('placeholder-content');

    if (!file) return;
    if (placeholder) placeholder.style.display = 'none';

    if (file.type.startsWith('image/')) {
        imgPreview.src = URL.createObjectURL(file);
        imgPreview.style.display = 'block';
        if(vidPreview) vidPreview.style.display = 'none';
    } else if (file.type.startsWith('video/')) {
        vidPreview.src = URL.createObjectURL(file);
        vidPreview.style.display = 'block';
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
        
        // 1. Upload ke Storage
        const { error: uploadError } = await snapSupabase.storage
            .from('videos')
            .upload(fileName, file);

        if (uploadError) throw uploadError;

        // 2. Ambil URL
        const { data: urlData } = snapSupabase.storage.from('videos').getPublicUrl(fileName);

        // 3. Simpan ke Database
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
// 5. LOAD FEED & AUTH (KEKALKAN YANG ASAL)
// ==========================================
// ... (Masukkan fungsi loadHomeFeed, handleLogin, handleRegister dari kod asal anda di sini) ...
// Pastikan dalam loadHomeFeed, ID Like diletakkan seperti ini: id="like-icon-${vid.id}"
