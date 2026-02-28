# 🚀 Panduan Deploy SnapFlow
### Netlify + GitHub + Supabase

---

## BAHAGIAN 1 — SUPABASE (5 minit)

### Langkah 1.1 — Jalankan SQL
1. Buka **Supabase Dashboard** → pilih projek anda
2. Pergi ke **SQL Editor** → **New Query**
3. Salin semua kandungan dari fail `snapflow_supabase.sql`
4. Klik **Run** — semak semua 6 table ada ✅

### Langkah 1.2 — Aktifkan Realtime
1. Pergi ke **Database** → **Replication**
2. Cari table: `videos`, `likes`, `comments`, `notifications`, `messages`
3. Toggle ON untuk semua table tersebut

### Langkah 1.3 — Setup Storage
1. Pergi ke **Storage** → **Buckets**
2. Semak ada dua bucket: `videos` dan `images`
3. Jika belum ada — SQL tadi akan buat secara automatik

### Langkah 1.4 — Semak URL & Key
1. Pergi ke **Settings** → **API**
2. Catat **Project URL** dan **anon/public** key
3. Pastikan nilai dalam `app.js` betul:
```javascript
const supabaseUrl = "https://XXXXX.supabase.co";
const supabaseKey = "eyJhbGci...";
```

---

## BAHAGIAN 2 — GITHUB (5 minit)

### Langkah 2.1 — Buat Repository
1. Pergi ke [github.com](https://github.com) → **New repository**
2. Nama repo: `snapflow` (atau nama lain)
3. Pilih **Public** atau **Private**
4. **JANGAN** tick "Add README" — repo mesti kosong
5. Klik **Create repository**

### Langkah 2.2 — Upload Fail ke GitHub
**Cara A — Guna GitHub Web (Mudah):**
1. Dalam repo baru, klik **uploading an existing file**
2. Drag & drop SEMUA fail dari folder SnapFlow-upgraded
3. Pastikan termasuk: `netlify.toml`, `manifest.json`, `service-worker.js`
4. Commit message: `Initial SnapFlow deployment`
5. Klik **Commit changes**

**Cara B — Guna Terminal (Laju):**
```bash
cd SnapFlow-upgraded
git init
git add .
git commit -m "Initial SnapFlow deployment"
git remote add origin https://github.com/NAMA_ANDA/snapflow.git
git branch -M main
git push -u origin main
```

### Langkah 2.3 — Semak Struktur Fail
Pastikan struktur dalam GitHub seperti ini:
```
snapflow/
├── index.html          ← Mesti ada di ROOT
├── app.js
├── style.css
├── manifest.json       ← PENTING untuk PWA
├── service-worker.js   ← PENTING untuk PWA
├── netlify.toml        ← PENTING untuk Netlify
├── splash.html
├── discover.html
├── ... (semua .html lain)
└── .github/
    └── workflows/
        └── deploy.yml  ← Auto-deploy (optional)
```

---

## BAHAGIAN 3 — NETLIFY (5 minit)

### Langkah 3.1 — Sambung GitHub ke Netlify
1. Buka [netlify.com](https://netlify.com) → **Log in**
2. Klik **Add new site** → **Import an existing project**
3. Pilih **Deploy with GitHub**
4. Authorize Netlify untuk akses GitHub anda
5. Pilih repo `snapflow`

### Langkah 3.2 — Tetapan Deploy
Isi tetapan berikut:
| Tetapan | Nilai |
|---------|-------|
| Branch to deploy | `main` |
| Base directory | *(kosongkan)* |
| Build command | *(kosongkan)* |
| Publish directory | `.` |

Klik **Deploy site**

### Langkah 3.3 — Tukar Domain (Optional)
1. Pergi ke **Site configuration** → **Domain management**
2. Klik **Add custom domain** untuk domain sendiri, ATAU
3. Klik **Change site name** untuk tukar nama subdomain
   - Contoh: `snapflow-saya.netlify.app`

---

## BAHAGIAN 4 — GITHUB SECRETS (Untuk Auto-Deploy)

> Langkah ini untuk fail `.github/workflows/deploy.yml` supaya
> GitHub auto-deploy ke Netlify setiap kali push.

### Langkah 4.1 — Dapatkan Netlify Token
1. Netlify Dashboard → **User settings** → **Applications**
2. Klik **New access token**
3. Nama: `GitHub Actions`
4. Salin token (simpan, hanya nampak sekali)

### Langkah 4.2 — Dapatkan Site ID
1. Netlify Dashboard → pilih site SnapFlow
2. **Site configuration** → **General**
3. Salin **Site ID** (format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

### Langkah 4.3 — Tambah Secrets ke GitHub
1. GitHub → repo `snapflow` → **Settings** → **Secrets and variables** → **Actions**
2. Klik **New repository secret** — tambah DUA secret:

| Name | Value |
|------|-------|
| `NETLIFY_AUTH_TOKEN` | Token dari Langkah 4.1 |
| `NETLIFY_SITE_ID` | Site ID dari Langkah 4.2 |

**Selepas ini** — setiap `git push` ke branch `main` akan auto-deploy ke Netlify! ✅

---

## BAHAGIAN 5 — SEMAKAN AKHIR

### Checklist PWA ✅
Setelah deploy, buka Chrome DevTools → **Lighthouse** → **Progressive Web App**:

- [ ] HTTPS aktif (Netlify auto-buat)
- [ ] `manifest.json` dikenali
- [ ] Service Worker berdaftar
- [ ] Boleh install dari Chrome/Edge
- [ ] Halaman offline berfungsi (matikan internet, reload)

### Test Install di Telefon
1. Buka URL Netlify dalam **Chrome Android** atau **Safari iOS**
2. **Android** — Banner "Add to Home Screen" akan muncul automatik
3. **iOS** — Ketik ikon Kongsi → "Add to Home Screen"

### URL Supabase Realtime
Pastikan Realtime berfungsi:
1. Buka dua tab browser dengan URL yang sama
2. Tab 1: Like sebuah video
3. Tab 2: Kiraan like sepatutnya update automatik ⚡

---

## MASALAH LAZIM

**❌ Service Worker gagal daftar**
- Pastikan URL adalah HTTPS (bukan HTTP)
- Netlify auto-provide HTTPS — jadi sepatutnya ok

**❌ Video tidak boleh upload**
- Semak Supabase Storage bucket `videos` wujud
- Semak RLS policy Storage dalam SQL

**❌ Supabase API error 401**
- Semak `supabaseKey` dalam `app.js` — mesti key `anon/public`
- Bukan `service_role` key

**❌ Realtime tidak berfungsi**
- Semak Replication dah ON untuk table `likes`, `comments`, `notifications`
- Semak dalam Supabase: Database → Replication

**❌ PWA tidak muncul prompt install**
- Mesti HTTPS
- Mesti ada `manifest.json` dengan icon 192x192 dan 512x512
- Chrome akan prompt setelah pengguna lawat beberapa kali

---

*Dijana oleh SnapFlow Setup Guide*
