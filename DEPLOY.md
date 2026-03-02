# SnapFlow v4.0 — Panduan Deploy Production

## Prasyarat

- Akaun Supabase (Free tier OK untuk testing)
- Akaun Stripe (untuk pembayaran)
- Akaun Netlify (hosting)
- Node.js 18+ (untuk Supabase CLI)

---

## STEP 1 — Supabase Setup

### 1a. Buat Projek Baru
```
supabase.com → New Project
Project Name: snapflow
Database Password: [simpan dengan selamat]
Region: Southeast Asia (Singapore)
```

### 1b. Run SQL Schema
```
Supabase Dashboard → SQL Editor → New Query
Paste: kandungan snapflow_supabase.sql
Klik: RUN
```

### 1c. Konfigurasi Auth
```
Authentication → Settings:
  Site URL: https://your-app.netlify.app
  Redirect URLs: https://your-app.netlify.app/*

Authentication → Providers:
  Email: ✅ Enable
  Email Confirmations: ✅ ON (cadangan)
  Google OAuth: Setup jika perlu
  Apple Sign In: Setup jika perlu
```

### 1d. Realtime Tables
```
Database → Replication → Source → supabase_realtime
Tambah tables: messages, notifications, live_sessions
```

### 1e. Storage Buckets
```
Storage → New Bucket:
  - videos      (Public: ON, Max: 100MB)
  - thumbnails  (Public: ON, Max: 5MB)
  - avatars     (Public: ON, Max: 2MB)
```

---

## STEP 2 — Kemaskini Konfigurasi App

Edit `app.js` baris 4-5:
```javascript
const supabaseUrl = "https://YOUR-PROJECT.supabase.co";
const supabaseKey = "eyJ..."; // anon/public key sahaja
```

---

## STEP 3 — Deploy Edge Functions

### Install Supabase CLI
```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

### Set Secrets
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
supabase secrets set STRIPE_PRO_PRICE_ID=price_xxx
supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxx
supabase secrets set CRON_SECRET=pilih_secret_kuat_rawak
supabase secrets set APP_URL=https://your-app.netlify.app
```

### Deploy Semua Functions
```bash
supabase functions deploy create-checkout
supabase functions deploy stripe-webhook
supabase functions deploy publish-scheduled
supabase functions deploy generate-caption
supabase functions deploy generate-subtitle
supabase functions deploy weekly-report
supabase functions deploy cleanup-stories
```

---

## STEP 4 — Setup Stripe

### Webhook
```
Stripe Dashboard → Developers → Webhooks → Add Endpoint

Endpoint URL:
https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook

Events untuk subscribe:
✅ checkout.session.completed
✅ customer.subscription.created
✅ customer.subscription.updated
✅ customer.subscription.deleted
✅ invoice.payment_failed
```

Salin `Signing secret` (whsec_xxx) → set sebagai `STRIPE_WEBHOOK_SECRET`

---

## STEP 5 — Deploy ke Netlify

### Auto Deploy (GitHub)
```bash
git add .
git commit -m "SnapFlow v4.0 production"
git push origin main
# GitHub Actions CI/CD akan deploy ke Netlify
```

### Manual Deploy
```
Netlify Dashboard → Sites → Import from Git
Build command: (kosong)
Publish directory: .
```

---

## STEP 6 — Test Sebelum Launch

### Auth Flow
```
✅ Daftar akaun baru → dapat emel pengesahan
✅ Klik link emel → akaun aktif
✅ Log masuk → redirect ke home
✅ Lupa kata laluan → dapat emel reset
✅ Reset kata laluan → boleh login
✅ Log keluar → redirect ke splash
```

### Payment Flow
```
✅ Tambah produk ke cart
✅ Checkout → Stripe payment page
✅ Bayar dengan kad test: 4242 4242 4242 4242
✅ Order berjaya → redirect ke order-success
✅ Cuba manipulate harga dalam URL → HARUS GAGAL
```

### Security Tests
```
✅ Buka admin.html tanpa login → redirect ke splash
✅ Buka cart.html tanpa login → redirect ke splash
✅ Cuba akses admin sebagai user biasa → "Akses Dinafikan"
✅ Supabase RLS → query data orang lain HARUS gagal
```

---

## Checklist Keselamatan

```
✅ Tiada sk_live / sk_test dalam frontend
✅ Tiada whsec_ dalam frontend
✅ Tiada service_role key dalam frontend
✅ Supabase anon key sahaja dalam app.js (ini normal & selamat)
✅ RLS aktif semua 26 tables
✅ 65 RLS policies configured
✅ Stripe harga dari database (bukan frontend)
✅ JWT verification dalam semua Edge Functions
✅ CRON_SECRET untuk publish-scheduled
✅ Auth guard untuk 26 HTML pages
✅ Admin role verify dari database
```

---

## Maklumat Berguna

| Item | Nilai |
|------|-------|
| Supabase Project | trrfsredzugdyppevcbw |
| Supabase URL | https://trrfsredzugdyppevcbw.supabase.co |
| Stripe Mode | Test (tukar ke Live untuk production) |
| SW Version | v4.0.0 |
| App Version | SnapFlow v4.0 |

---

## Cron Jobs (Supabase Edge Functions Scheduler)

```
publish-scheduled  → */5 * * * *   (setiap 5 minit)
cleanup-stories    → 0 * * * *     (setiap jam)
weekly-report      → 0 9 * * 1     (Isnin 9am)
```

Setup dalam: Supabase Dashboard → Edge Functions → [function] → Schedules
