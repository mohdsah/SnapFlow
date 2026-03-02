# SnapFlow — Production Deploy Checklist v4.0

## ✅ STEP 1: Supabase Setup

### 1a. Run SQL Schema
```
Supabase Dashboard → SQL Editor → New Query
Paste kandungan: snapflow_supabase.sql
Klik RUN
```

### 1b. Enable Authentication
```
Supabase Dashboard → Authentication → Providers
- Email: ✅ ON
- Google OAuth: Setup (optional)
- Apple Sign In: Setup (optional)

Authentication → Settings:
- Site URL: https://your-app.netlify.app
- Redirect URLs: tambah https://your-app.netlify.app/*
```

### 1c. Enable Email Confirmation (Recommended)
```
Authentication → Settings → Email Confirmation: ON
```

### 1d. Realtime
```
Database → Replication → tambah tables:
- messages ✅
- notifications ✅
- live_sessions ✅
```

### 1e. Storage Buckets
```
Storage → New Bucket:
- videos (Public: ON, Max size: 100MB)
- thumbnails (Public: ON, Max size: 5MB)
- avatars (Public: ON, Max size: 2MB)
```

---

## ✅ STEP 2: Deploy Edge Functions

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF

# Deploy semua functions
npx supabase functions deploy create-checkout
npx supabase functions deploy stripe-webhook
npx supabase functions deploy publish-scheduled
npx supabase functions deploy generate-caption
npx supabase functions deploy generate-subtitle
npx supabase functions deploy weekly-report
npx supabase functions deploy cleanup-stories
```

### 2a. Set Secrets
```bash
npx supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
npx supabase secrets set STRIPE_PRO_PRICE_ID=price_xxx
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxx
npx supabase secrets set RESEND_API_KEY=re_xxx
npx supabase secrets set CRON_SECRET=random_strong_secret_here
npx supabase secrets set APP_URL=https://your-app.netlify.app
```

---

## ✅ STEP 3: Stripe Setup

### 3a. Webhook
```
Stripe Dashboard → Developers → Webhooks → Add Endpoint

URL: https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook

Events:
✅ checkout.session.completed
✅ customer.subscription.created
✅ customer.subscription.updated
✅ customer.subscription.deleted
✅ invoice.payment_failed
```

### 3b. Salin Webhook Secret
```
Selepas buat webhook, salin "Signing secret" (whsec_xxx)
Set: npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
```

---

## ✅ STEP 4: Netlify Deploy

### 4a. Environment Variables
```
Netlify → Site → Environment Variables:

VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx (anon key sahaja!)

❌ JANGAN tambah: STRIPE_SECRET_KEY (backend sahaja)
❌ JANGAN tambah: SUPABASE_SERVICE_ROLE_KEY (backend sahaja)
```

### 4b. Deploy
```bash
git add . && git commit -m "Production deploy v4.0"
git push origin main
# GitHub Actions akan auto-deploy ke Netlify
```

---

## ✅ STEP 5: Test Critical Paths

### Security Tests
```
❌ Cuba buka admin.html tanpa login → Sepatutnya redirect ke splash.html
❌ Cuba buka cart.html tanpa login → Sepatutnya redirect ke splash.html
❌ Cuba manipulate harga dalam DevTools → Sepatutnya ditolak server
❌ Cuba hantar webhook palsu ke Stripe endpoint → Sepatutnya 400 error
✅ Stripe checkout dengan harga betul → Berjaya
✅ Email confirmation flow → User dapat emel, klik link, boleh login
✅ Password reset flow → User dapat emel, klik link, boleh set password baru
✅ Login dengan emel yang belum disahkan → Tunjuk notis dengan butang resend
```

### Functional Tests
```
✅ Register akaun baru
✅ Login / Logout
✅ Upload video
✅ Like / Comment / Follow
✅ Shop → Cart → Checkout → Payment
✅ Chat realtime
✅ PWA install
✅ Offline mode
```

---

## 🔒 SECURITY CHECKLIST

```
✅ Tiada secret key dalam frontend (sk_live, sk_test, whsec_)
✅ Tiada service_role key dalam frontend
✅ Supabase anon key sahaja dalam app.js (ini NORMAL dan selamat)
✅ RLS aktif untuk semua 26 tables
✅ 65 RLS policies (semua CRUD dilindungi)
✅ Stripe harga dari DB bukan frontend
✅ JWT verification dalam Edge Functions
✅ User ID mismatch check dalam checkout
✅ Webhook signature verification (Stripe)
✅ Auth guard untuk semua protected pages
✅ Admin role verified dari DB (bukan localStorage)
✅ CRON_SECRET untuk protect scheduled functions
✅ Rate limiting table ready
✅ Audit logs untuk tindakan kritikal
```

---

## 📱 SELEPAS DEPLOY

### Monitor
- Supabase Dashboard → Logs → Edge Function Logs
- Stripe Dashboard → Events
- Netlify → Functions → Logs

### Performance
- Tambah image ke Supabase Storage (bukan external CDN)
- Enable Supabase Edge Caching
- Compress images sebelum upload

