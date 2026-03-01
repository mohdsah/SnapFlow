// SnapFlow — UPLOAD Module
// 10. UPLOAD VIDEO/GAMBAR
// ==========================================
// State untuk upload
let currentFilter  = 'none';
let compressEnabled = false;
let isDuetMode     = false;
let duetSourceVideo = null; // { id, url }

function previewFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const previewImg = document.getElementById('preview-img');
    const previewVid = document.getElementById('preview-vid');
    const placeholder = document.getElementById('placeholder-content');
    const filterSection = document.getElementById('filter-section');

    if (placeholder) placeholder.style.display = 'none';

    const url = URL.createObjectURL(file);

    if (file.type.startsWith('video/')) {
        if (previewImg) previewImg.style.display = 'none';
        if (previewVid) {
            previewVid.src = url;
            previewVid.style.display = 'block';
            previewVid.style.filter = 'none';
        }
        if (filterSection) filterSection.style.display = 'block';

        // Tunjuk saiz fail + cadangan compress
        const sizeMB = (file.size / 1024 / 1024).toFixed(1);
        const statusEl = document.getElementById('compress-status');
        if (statusEl) {
            statusEl.innerText = `Saiz asal: ${sizeMB}MB${file.size > 20*1024*1024 ? ' — Disyorkan dimampatkan' : ''}`;
        }
        if (file.size > 20*1024*1024) {
            const toggle = document.getElementById('compress-toggle');
            if (toggle) { toggle.checked = true; toggleCompress(toggle); }
        }
    } else {
        if (previewVid) previewVid.style.display = 'none';
        if (previewImg) {
            previewImg.src = url;
            previewImg.style.display = 'block';
            previewImg.style.filter = 'none';
        }
        if (filterSection) filterSection.style.display = 'block';
    }

    // Reset filter buttons
    currentFilter = 'none';
    document.querySelectorAll('.filter-btn').forEach(b => {
        b.style.borderColor = 'transparent';
        b.style.color = '#aaa';
    });
    const firstBtn = document.querySelector('.filter-btn');
    if (firstBtn) { firstBtn.style.borderColor = '#fe2c55'; firstBtn.style.color = '#fff'; }
}

// ── Terapkan filter pada preview ─────────────────
function applyFilter(filterValue, btn) {
    currentFilter = filterValue;

    // Kemas kini butang
    document.querySelectorAll('.filter-btn').forEach(b => {
        b.style.borderColor = 'transparent';
        b.style.color = '#aaa';
    });
    btn.style.borderColor = '#fe2c55';
    btn.style.color = '#fff';

    // Apply filter pada preview
    const vid = document.getElementById('preview-vid');
    const img = document.getElementById('preview-img');
    if (vid && vid.style.display !== 'none') vid.style.filter = filterValue === 'none' ? '' : filterValue;
    if (img && img.style.display !== 'none') img.style.filter = filterValue === 'none' ? '' : filterValue;

    // Nota: filter CSS tidak embedded dalam video — filter hanya untuk preview visual
    // Untuk embed sebenar guna canvas (terlalu berat untuk mobile)
}

function toggleCompress(toggle) {
    compressEnabled = toggle.checked;
    const slider = document.getElementById('compress-slider');
    const status  = document.getElementById('compress-status');
    if (slider) slider.style.background = compressEnabled ? '#fe2c55' : '#333';
    const file = document.getElementById('file-input')?.files[0];
    const sizeMB = file ? (file.size / 1024 / 1024).toFixed(1) : '?';
    if (status) status.innerText = compressEnabled
        ? `Aktif — anggaran jimat ~40% dari ${sizeMB}MB`
        : `Tidak aktif — saiz asal ${sizeMB}MB`;
}

async function startUpload() {
    const fileInput = document.getElementById('file-input');
    const caption   = document.getElementById('video-caption')?.value?.trim();
    const btn       = document.getElementById('upload-btn');

    if (!fileInput?.files[0]) return showToast('Sila pilih fail dahulu.', 'warning');

    let file = fileInput.files[0];
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) return showToast('Fail terlalu besar. Maksimum 50MB.', 'error');

    setLoading(btn, true, 'Memproses...');

    try {
        const { data: { user } } = await snapSupabase.auth.getUser();
        if (!user) { setLoading(btn, false, 'Kongsi Sekarang'); return showToast('Sila log masuk.', 'warning'); }

        // ── Video Compression (jika aktif) ───────────────
        if (compressEnabled && file.type.startsWith('video/')) {
            showToast('Memampatkan video...', 'info');
            try {
                file = await compressVideo(file);
                const newMB = (file.size / 1024 / 1024).toFixed(1);
                showToast(`Video dimampatkan: ${newMB}MB ✅`, 'success');
            } catch (e) {
                console.warn('Compression gagal, guna fail asal:', e);
            }
        }

        setLoading(btn, true, 'Memuat naik...');

        const fileExt  = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        const bucket   = file.type.startsWith('video/') ? 'videos' : 'images';

        const { error: uploadError } = await snapSupabase.storage
            .from(bucket).upload(fileName, file, { upsert: false });
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = snapSupabase.storage.from(bucket).getPublicUrl(fileName);

        // Tambah filter label dalam caption jika bukan 'none'
        const filterLabel  = currentFilter !== 'none' ? ` [filter:${currentFilter.replace(/[()%,.]/g,'')}]` : '';
        const duetLabel    = isDuetMode && duetSourceVideo ? ` [duet:${duetSourceVideo.id}]` : '';
        const finalCaption = (caption || '') + filterLabel + duetLabel;

        const { error: dbError } = await snapSupabase.from('videos').insert([{
            user_id:    user.id,
            video_url:  publicUrl,
            caption:    finalCaption,
            username:   user.user_metadata?.full_name || 'User',
            likes_count: 0,
            is_duet:    isDuetMode,
            duet_source_id: isDuetMode && duetSourceVideo ? duetSourceVideo.id : null,
            scheduled_at:  scheduleAt || null,
            is_published:  scheduleAt ? false : true,
        }]);
        if (dbError) throw dbError;

        if (scheduleAt) {
            const dt = new Date(scheduleAt).toLocaleString('ms-MY');
            showToast(`Video dijadualkan pada ${dt} 📅`, 'success');
        } else {
            showToast('Video berjaya dikongsikan! 🎉', 'success');
        }
        setTimeout(() => window.location.href = 'index.html', 1500);

    } catch (err) {
        console.error('Upload error:', err);
        showToast('Ralat semasa upload: ' + err.message, 'error');
        setLoading(btn, false, 'Kongsi Sekarang');
    }
}

// ==========================================
// 26. THUMBNAIL AUTO-JANA (Canvas)
// ==========================================

const thumbnailCache = {}; // Cache supaya tidak jana semula

function generateThumbnail(videoUrl, videoId) {
    if (thumbnailCache[videoId]) {
        drawThumbnailToCanvas(thumbnailCache[videoId], videoId);
        return;
    }

    const video = document.createElement('video');
    video.src = videoUrl;
    video.muted = true;
    video.crossOrigin = 'anonymous';
    video.preload = 'metadata';

    video.addEventListener('loadeddata', () => {
        // Lompat ke saat ke-1 untuk elak frame hitam
        video.currentTime = Math.min(1, video.duration * 0.1);
    });

    video.addEventListener('seeked', () => {
        try {
            const canvas = document.getElementById(`thumb-${videoId}`);
            if (!canvas) return;

            // Set dimensi canvas ikut ratio video
            canvas.width  = video.videoWidth  || 360;
            canvas.height = video.videoHeight || 640;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Cache sebagai dataURL
            thumbnailCache[videoId] = canvas.toDataURL('image/jpeg', 0.7);

            // Kosongkan video element untuk jimat memori
            video.src = '';
            video.load();
        } catch (e) {
            // Cross-origin error — guna placeholder
            drawPlaceholderThumbnail(videoId);
        }
    });

    video.addEventListener('error', () => drawPlaceholderThumbnail(videoId));
    video.load();
}

function drawThumbnailToCanvas(dataUrl, videoId) {
    const canvas = document.getElementById(`thumb-${videoId}`);
    if (!canvas) return;
    const img = new Image();
    img.onload = () => {
        canvas.width  = img.width;
        canvas.height = img.height;
        canvas.getContext('2d').drawImage(img, 0, 0);
    };
    img.src = dataUrl;
}

function drawPlaceholderThumbnail(videoId) {
    const canvas = document.getElementById(`thumb-${videoId}`);
    if (!canvas) return;
    canvas.width  = 360;
    canvas.height = 640;
    const ctx = canvas.getContext('2d');
    // Gradient placeholder
    const grad = ctx.createLinearGradient(0, 0, 0, 640);
    grad.addColorStop(0, '#1a1a1a');
    grad.addColorStop(1, '#0d0d0d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 360, 640);
    // Ikon video
    ctx.fillStyle = '#333';
    ctx.font = '48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎬', 180, 340);
}

// ==========================================
// 30. VIDEO COMPRESSION (Canvas-based)
// ==========================================

async function compressVideo(file) {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.src   = URL.createObjectURL(file);
        video.muted = true;
        video.playsInline = true;

        video.addEventListener('loadedmetadata', () => {
            // Target: lebar max 720px, jimat ~40%
            const targetW = Math.min(video.videoWidth, 720);
            const ratio   = targetW / video.videoWidth;
            const targetH = Math.round(video.videoHeight * ratio);

            const canvas  = document.createElement('canvas');
            canvas.width  = targetW;
            canvas.height = targetH;
            const ctx     = canvas.getContext('2d');

            // Guna MediaRecorder untuk encode semula
            let stream;
            try {
                stream = canvas.captureStream(24); // 24fps
            } catch (e) {
                return reject(new Error('captureStream tidak disokong'));
            }

            const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
                ? 'video/webm;codecs=vp9'
                : MediaRecorder.isTypeSupported('video/webm')
                    ? 'video/webm'
                    : null;

            if (!mimeType) return reject(new Error('Format tidak disokong'));

            const recorder = new MediaRecorder(stream, {
                mimeType,
                videoBitsPerSecond: 1_500_000 // 1.5 Mbps
            });

            const chunks = [];
            recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: mimeType });
                const compressed = new File([blob], file.name.replace(/\.[^.]+$/, '.webm'), {
                    type: mimeType,
                    lastModified: Date.now()
                });
                URL.revokeObjectURL(video.src);
                resolve(compressed);
            };

            video.addEventListener('play', () => {
                recorder.start(100);
                const draw = () => {
                    if (video.paused || video.ended) {
                        recorder.stop();
                        return;
                    }
                    ctx.drawImage(video, 0, 0, targetW, targetH);
                    requestAnimationFrame(draw);
                };
                draw();
            });

            video.play().catch(reject);

            // Timeout 3 minit maksimum
            setTimeout(() => {
                if (recorder.state !== 'inactive') recorder.stop();
            }, 180_000);
        });

        video.addEventListener('error', reject);
        video.load();
    });
}

// ==========================================
// 36. JADUAL PUBLISH — Edge Function Trigger
// ==========================================

// Semak video yang dah tiba masa publish
async function checkScheduledVideos() {
    try {
        const { data: { user } } = await snapSupabase.auth.getUser();
        if (!user) return;

        const now = new Date().toISOString();
        const { data: scheduled } = await snapSupabase
            .from('videos')
            .select('id, caption, scheduled_at')
            .eq('user_id', user.id)
            .eq('is_published', false)
            .lte('scheduled_at', now)
            .not('scheduled_at', 'is', null);

        if (!scheduled || scheduled.length === 0) return;

        // Publish video-video yang dah tiba masa
        for (const vid of scheduled) {
            await snapSupabase.from('videos')
                .update({ is_published: true })
                .eq('id', vid.id);
            console.log(`[Schedule] Video ${vid.id} diterbitkan pada ${now}`);
        }

        if (scheduled.length > 0) {
            showToast(`${scheduled.length} video berjadual kini diterbitkan! 📅`, 'success');
            // Refresh feed jika ada
            if (typeof loadHomeFeed === 'function') loadHomeFeed();
        }
    } catch (err) {
        console.warn('[Schedule] Semak gagal:', err.message);
    }
}

// Semak setiap 5 minit bila app terbuka
setInterval(checkScheduledVideos, 5 * 60 * 1000);
checkScheduledVideos(); // Semak terus masa load

// ==========================================
// SUPABASE EDGE FUNCTION — publish-scheduled
// ==========================================
// Simpan dalam: supabase/functions/publish-scheduled/index.ts
// Jadual cron: */5 * * * * (setiap 5 minit)
//
// import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// Deno.serve(async () => {
//   const supabase = createClient(
//     Deno.env.get('SUPABASE_URL')!,
//     Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
//   )
//   const now = new Date().toISOString()
//   const { data, error } = await supabase
//     .from('videos')
//     .update({ is_published: true })
//     .eq('is_published', false)
//     .lte('scheduled_at', now)
//     .not('scheduled_at', 'is', null)
//     .select('id, user_id, caption')
//   // Hantar notifikasi kepada pemilik video
//   if (data?.length) {
//     for (const vid of data) {
//       await supabase.from('notifications').insert([{
//         user_id: vid.user_id, type: 'system',
//         message: `Video "${vid.caption?.slice(0,30)}" kini diterbitkan!`
//       }])
//     }
//   }
//   return new Response(JSON.stringify({ published: data?.length ?? 0 }))
// })

// ==========================================
// 39. RATE LIMITING UPLOAD
// ==========================================

const UPLOAD_LIMITS = {
    free: { perDay: 10, perHour: 3  },
    pro:  { perDay: 999, perHour: 50 }
};

function getUploadLog() {
    try {
        return JSON.parse(localStorage.getItem('sf_upload_log') || '[]');
    } catch { return []; }
}

function recordUpload() {
    const log = getUploadLog();
    log.push(Date.now());
    // Simpan hanya 1000 rekod terakhir
    localStorage.setItem('sf_upload_log', JSON.stringify(log.slice(-1000)));
}

function checkUploadRateLimit() {
    const isPro    = isUserPro();
    const limits   = isPro ? UPLOAD_LIMITS.pro : UPLOAD_LIMITS.free;
    const log      = getUploadLog();
    const now      = Date.now();
    const oneHour  = 60 * 60 * 1000;
    const oneDay   = 24 * oneHour;

    const lastHour = log.filter(t => now - t < oneHour).length;
    const lastDay  = log.filter(t => now - t < oneDay).length;

    if (lastHour >= limits.perHour) {
        const resetMins = Math.ceil((oneHour - (now - Math.min(...log.filter(t => now - t < oneHour)))) / 60000);
        return {
            allowed: false,
            reason:  `Had sejam dicapai (${limits.perHour} video/jam). Cuba lagi dalam ${resetMins} minit.`,
            isPro
        };
    }

    if (lastDay >= limits.perDay) {
        const resetHrs = Math.ceil((oneDay - (now - Math.min(...log.filter(t => now - t < oneDay)))) / 3600000);
        return {
            allowed: false,
            reason:  `Had harian dicapai (${limits.perDay} video/hari). Cuba lagi dalam ${resetHrs} jam.`,
            isPro
        };
    }

    return {
        allowed:   true,
        remaining: { hour: limits.perHour - lastHour, day: limits.perDay - lastDay },
        isPro
    };
}

function showRateLimitWarning(result) {
    document.getElementById('rate-limit-modal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'rate-limit-modal';
    modal.innerHTML = `
        <div onclick="document.getElementById('rate-limit-modal').remove()"
             style="position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9500;"></div>
        <div style="position:fixed;bottom:0;left:0;right:0;background:#111;border-radius:20px 20px 0 0;
                    padding:24px;z-index:9501;border-top:1px solid #222;text-align:center;">
            <div style="font-size:48px;margin-bottom:12px;">⏱️</div>
            <h3 style="margin:0 0 8px;font-size:17px;font-weight:800;">Had Upload Dicapai</h3>
            <p style="margin:0 0 16px;font-size:14px;color:#555;line-height:1.6;">${result.reason}</p>

            ${!result.isPro ? `
            <div style="background:#1a1200;border:1px solid #333;border-radius:12px;padding:14px;margin-bottom:16px;">
                <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#f6c90e;">⭐ Naik ke SnapFlow Pro</p>
                <p style="margin:0;font-size:13px;color:#665500;">Upload sehingga 50 video/jam tanpa had harian.</p>
            </div>
            <button onclick="document.getElementById('rate-limit-modal').remove();openProModal();"
                style="width:100%;background:linear-gradient(135deg,#f6c90e,#ffdf6b);color:#000;border:none;
                       padding:14px;border-radius:12px;font-size:15px;font-weight:900;cursor:pointer;font-family:inherit;margin-bottom:8px;">
                ⭐ Dapatkan Pro
            </button>` : ''}

            <button onclick="document.getElementById('rate-limit-modal').remove()"
                style="width:100%;background:transparent;border:none;color:#555;padding:10px;cursor:pointer;font-family:inherit;font-size:14px;">
                OK, Faham
            </button>
        </div>`;
    document.body.appendChild(modal);
}

// Tunjuk counter upload yang tinggal di halaman upload
function showUploadQuota() {
    const result = checkUploadRateLimit();
    const el     = document.getElementById('upload-quota');
    if (!el) return;

    if (!result.allowed) {
        el.innerHTML = `<span style="color:#fe2c55;font-size:12px;font-weight:700;">⏱️ Had upload dicapai</span>`;
        return;
    }

    const { remaining, isPro } = result;
    el.innerHTML = `
        <span style="font-size:12px;color:#555;">
            ${isPro ? '⭐ Pro · ' : ''} Baki hari ini: <strong style="color:#fff;">${remaining.day}</strong> video
            &nbsp;·&nbsp; Jam ini: <strong style="color:#fff;">${remaining.hour}</strong> video
        </span>`;
}

// Hook into startUpload untuk semak rate limit
const _origStartUpload = window.startUpload;
if (typeof startUpload === 'function') {
    const _origFn = startUpload;
    window.startUpload = async function() {
        const rateCheck = checkUploadRateLimit();
        if (!rateCheck.allowed) {
            showRateLimitWarning(rateCheck);
            return;
        }
        await _origFn.apply(this, arguments);
        // Record berjaya upload
        recordUpload();
        showUploadQuota();
    };
}

// ==========================================
