# SKYNET — Panduan Setup Supabase (Lengkap)

## 🚨 Kenapa Video/Gambar Tidak Muncul Selepas Upload?

Ini adalah masalah konfigurasi Supabase. Ikut langkah di bawah untuk betulkan.

---

## STEP 1 — Buat Projek Supabase

1. Pergi ke **https://supabase.com** → Sign in
2. Klik **"New Project"**
3. Isi:
   - Project Name: `skynet`
   - Database Password: (simpan ini!)
   - Region: **Southeast Asia (Singapore)**
4. Tunggu 2-3 minit untuk projek setup

---

## STEP 2 — Run SQL Schema

1. Dalam Supabase Dashboard → klik **"SQL Editor"** (ikon folder kiri)
2. Klik **"New Query"**
3. **Copy semua kandungan** fail `skynet_supabase.sql`
4. Paste ke SQL Editor
5. Klik **"Run"** (Ctrl+Enter)
6. Pastikan tiada error merah

> ⚠️ Jika ada error "already exists", itu normal — SQL guna `IF NOT EXISTS`

---

## STEP 3 — Buat Storage Buckets (PALING PENTING!)

### Cara 1: Manual (lebih selamat)

Pergi ke **Storage** → **New Bucket** dan buat 5 bucket ini:

| Bucket Name | Public | File Size Limit | Allowed Types |
|-------------|--------|-----------------|---------------|
| `videos` | ✅ ON | 100 MB | video/* |
| `media` | ✅ ON | 10 MB | image/* |
| `avatars` | ✅ ON | 5 MB | image/* |
| `stories` | ✅ ON | 50 MB | video/*, image/* |
| `thumbnails` | ✅ ON | 5 MB | image/* |

**Langkah untuk setiap bucket:**
```
Storage → New Bucket
Name: videos          ← nama bucket
Public bucket: ✅     ← WAJIB on supaya video boleh ditonton
Save
```

### Cara 2: SQL (lebih cepat)

Run ini dalam SQL Editor:
```sql
insert into storage.buckets (id, name, public, file_size_limit)
values 
  ('videos',     'videos',     true, 104857600),
  ('media',      'media',      true, 10485760),
  ('avatars',    'avatars',    true, 5242880),
  ('stories',    'stories',    true, 52428800),
  ('thumbnails', 'thumbnails', true, 5242880)
on conflict (id) do nothing;
```

---

## STEP 4 — Set Storage Policies

Selepas buat bucket, pergi ke **Storage → Policies** dan pastikan ada policies ini. Atau run SQL dari `skynet_supabase.sql` (bahagian Storage Policies).

Kalau tak ada policies, video akan **upload berjaya tapi tak boleh ditonton** (403 error).

---

## STEP 5 — Konfigurasi Authentication

### 5a. Basic Settings
```
Authentication → Settings → General

Site URL: https://your-netlify-app.netlify.app
(guna http://localhost:3000 untuk testing lokal)

Redirect URLs (tambah semua ini):
- https://your-app.netlify.app/*
- http://localhost:3000/*
- http://127.0.0.1:5500/*
```

### 5b. Email Settings
```
Authentication → Settings → Email

Enable Email Confirmations: 
  - ON  → user perlu klik link dalam emel sebelum boleh login
  - OFF → user terus boleh login tanpa verify (untuk testing)

Recommend: OFF semasa testing, ON untuk production
```

### 5c. Email Template (Optional)
```
Authentication → Email Templates

Confirm Signup:
  Tukar bahasa kepada Bahasa Melayu jika mahu
```

---

## STEP 6 — Kemaskini app.js

Buka `app.js` dan tukar baris 4-5:

```javascript
// SEBELUM (akan nampak ini):
const supabaseUrl = "https://XXXXX.supabase.co";
const supabaseKey = "eyJXXXXX...";

// SELEPAS (isi dengan project anda):
const supabaseUrl = "https://YOUR-PROJECT-REF.supabase.co";
const supabaseKey = "eyJ..."; // ANON PUBLIC KEY sahaja!
```

Dapatkan nilai ini dari:
```
Supabase Dashboard → Settings (gear icon) → API

Project URL: https://xxxx.supabase.co      ← supabaseUrl
anon public key: eyJxxx...                 ← supabaseKey (BUKAN service_role!)
```

---

## STEP 7 — Enable Realtime (untuk Chat & Notifikasi)

```
Database → Replication (atau Database → Tables)

Aktifkan Realtime untuk:
✅ messages
✅ notifications  
✅ live_sessions
```

Atau run SQL:
```sql
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table live_sessions;
```

---

## STEP 8 — Test Upload

1. Buka app → Login
2. Pergi ke Upload
3. Pilih video/gambar
4. Klik "Kongsi Sekarang"
5. Pergi ke Storage → videos (atau media) → pastikan fail ada
6. Pergi ke Home feed → video/gambar patut muncul

---

## 🔧 Troubleshoot: Video Tidak Muncul

### Masalah 1: "Ralat semasa upload: scheduleAt is not defined"
**✅ DAH DIFIX** dalam versi ini

### Masalah 2: Upload berjaya tapi video tak muncul dalam feed
**Sebab:** `is_published` = false dalam database  
**Semak:** Database → Table Editor → videos → lihat column `is_published`  
**Fix:** Run SQL:
```sql
update videos set is_published = true where is_published is null or is_published = false;
```

### Masalah 3: "Bucket not found" semasa upload
**Sebab:** Bucket Storage belum dibuat  
**Fix:** Ikut STEP 3 di atas

### Masalah 4: Video muncul tapi tak boleh main (403 error)
**Sebab:** Storage bucket tidak public, atau tiada policy  
**Fix:** 
```
Storage → bucket (videos) → klik gear ⚙️ → Make Public
```
Atau tambah policy:
```sql
create policy "videos bucket: public read"
    on storage.objects for select
    using (bucket_id = 'videos');
```

### Masalah 5: "new row violates row-level security policy"
**Sebab:** RLS policy tidak benarkan insert  
**Fix:** Pastikan SQL schema dah run (STEP 2)

### Masalah 6: Video muncul dalam database tapi URL broken
**Sebab:** `publicUrl` salah format  
**Semak:** Storage → bucket → klik fail → salin URL → test dalam browser  
**URL betul:** `https://xxx.supabase.co/storage/v1/object/public/videos/USER_ID/FILENAME.mp4`

---

## 🔑 API Keys Yang Diperlukan

| Key | Di mana | Guna untuk |
|-----|---------|------------|
| `anon public` | app.js | Frontend (SELAMAT didedah) |
| `service_role` | Edge Functions sahaja | Backend admin (RAHSIA) |
| `STRIPE_SECRET_KEY` | Supabase Secrets | Payment |
| `STRIPE_WEBHOOK_SECRET` | Supabase Secrets | Webhook verify |
| `ANTHROPIC_API_KEY` | Supabase Secrets | AI features |

---

## ✅ Semak Akhir

Selepas setup, pastikan semua ini berfungsi:

```
✅ Register → dapat emel / terus masuk
✅ Login → redirect ke home
✅ Upload video → muncul dalam feed
✅ Upload gambar → muncul dalam feed
✅ Like → kiraan bertambah
✅ Comment → disimpan
✅ Profile → video muncul
✅ Chat → mesej hantar & terima realtime
```
