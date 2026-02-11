// ==========================================
// 1. FUNGSI MUAT NAIK (IMAGE & VIDEO)
// ==========================================

// Fungsi untuk paparan preview sebelum muat naik
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
        vidPreview.style.display = 'none';
    } else if (file.type.startsWith('video/')) {
        vidPreview.src = URL.createObjectURL(file);
        vidPreview.style.display = 'block';
        imgPreview.style.display = 'none';
    }
}

// Fungsi utama untuk hantar ke Supabase
async function startUpload() {
    const fileInput = document.getElementById('file-input');
    const file = fileInput.files[0];
    const caption = document.getElementById('video-caption').value.trim();
    const btn = document.getElementById('upload-btn');

    if (!file) return alert("Sila pilih gambar atau video dahulu.");

    btn.innerText = "Sedang Memuat Naik... ⏳";
    btn.disabled = true;

    try {
        const { data: { user } } = await snapSupabase.auth.getUser();
        if (!user) throw new Error("Sila log masuk.");

        const bucketName = 'videos'; 
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;

        // Upload ke Storage
        const { data: uploadData, error: uploadError } = await snapSupabase.storage
            .from(bucketName)
            .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Ambil Public URL
        const { data: urlData } = snapSupabase.storage.from(bucketName).getPublicUrl(fileName);
        const publicUrl = urlData.publicUrl;

        // Simpan ke Database Table 'videos'
        const { error: dbError } = await snapSupabase.from('videos').insert([{
            user_id: user.id,
            video_url: publicUrl,
            caption: caption,
            likes_count: 0
        }]);

        if (dbError) throw dbError;

        alert("Berjaya dikongsi! 🎉");
        window.location.href = "index.html";

    } catch (error) {
        alert("Gagal Muat Naik: " + error.message);
    } finally {
        btn.innerText = "Kongsi Sekarang";
        btn.disabled = false;
    }
}

// ==========================================
// 2. FUNGSI LIKE (WARNA MERAH & COUNT)
// ==========================================

async function handleLikeAction(videoId) {
    const icon = document.getElementById(`like-icon-${videoId}`);
    const countElement = document.getElementById(`like-count-${videoId}`);
    
    if (!icon || !countElement) return;

    try {
        const { data: { user } } = await snapSupabase.auth.getUser();
        if (!user) return alert("Sila log masuk untuk Like!");

        // Semak warna (Guna RGB kerana browser baca hex sebagai RGB)
        const isCurrentlyLiked = icon.style.color === 'rgb(254, 44, 85)';

        if (!isCurrentlyLiked) {
            // PROSES LIKE
            icon.style.color = '#fe2c55'; // Tukar MERAH
            countElement.innerText = parseInt(countElement.innerText) + 1;

            await snapSupabase.from('likes').insert([{ user_id: user.id, video_id: videoId }]);
            await snapSupabase.rpc('increment_likes', { row_id: videoId });
        } else {
            // PROSES UNLIKE
            icon.style.color = '#fff'; // Tukar PUTIH
            let currentCount = parseInt(countElement.innerText);
            countElement.innerText = currentCount > 0 ? currentCount - 1 : 0;

            await snapSupabase.from('likes').delete().eq('user_id', user.id).eq('video_id', videoId);
            await snapSupabase.rpc('decrement_likes', { row_id: videoId });
        }
    } catch (error) {
        console.error("Ralat Like:", error);
    }
}
