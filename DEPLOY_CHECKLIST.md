# SnapFlow — Deploy Checklist

## 🔴 WAJIB SEBELUM DEPLOY

### 1. Supabase Setup
- [ ] Run `snapflow_supabase.sql` dalam Supabase SQL Editor
- [ ] Enable Realtime untuk tables:
  - `likes`, `comments`, `notifications`, `messages`, `follows`, `live_sessions`
- [ ] Create Storage Buckets:
  - `videos` — public, max 500MB
  - `avatars` — public, max 5MB  
  - `stories` — public, max 50MB
  - `thumbnails` — public, max 5MB
- [ ] Set Admin user (ganti emel):
  ```sql
  UPDATE profiles SET role='admin', is_admin=TRUE
  WHERE id=(SELECT id FROM auth.users WHERE email='EMEL_ANDA@gmail.com');
  ```
- [ ] JWT Expiry: Dashboard → Auth → Settings → JWT Expiry = `3600`
- [ ] Enable email confirmations: Dashboard → Auth → Email Templates

### 2. Environment Variables (Netlify)
Di Netlify Dashboard → Site Settings → Environment Variables:
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
ANTHROPIC_API_KEY=sk-ant-...
RESEND_API_KEY=re_...
```

### 3. Supabase Edge Functions
```bash
# Deploy semua functions
npx supabase functions deploy stripe-webhook
npx supabase functions deploy create-checkout
npx supabase functions deploy generate-caption
npx supabase functions deploy generate-subtitle
npx supabase functions deploy weekly-report
npx supabase functions deploy publish-scheduled
npx supabase functions deploy cleanup-stories

# Set secrets
npx supabase secrets set STRIPE_SECRET_KEY=sk_live_...
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
npx supabase secrets set RESEND_API_KEY=re_...
```

### 4. Stripe Setup
- [ ] Webhook URL: `https://xxxxx.supabase.co/functions/v1/stripe-webhook`
- [ ] Events: `checkout.session.completed`, `payment_intent.succeeded`
- [ ] Verify webhook signature diaktifkan ✅ (sudah ada dalam kod)

### 5. Netlify Deploy
```bash
# Push ke GitHub, kemudian connect ke Netlify
# netlify.toml sudah configured dengan:
# - Redirect rules ✅
# - Security headers ✅
# - Cache rules ✅
```

---

## ✅ SUDAH DILAKUKAN (AUTO-FIX)

| Item | Status |
|------|--------|
| Auth guard semua 26 protected pages | ✅ |
| Admin role check dari Supabase DB | ✅ |
| `onAuthStateChange` auto redirect | ✅ |
| Session cache (tidak query DB berulang) | ✅ |
| RLS semua tables | ✅ |
| Admin policies (hanya admin boleh delete/update) | ✅ |
| Storage bucket policies | ✅ |
| `skipWaiting` + `clients.claim` dalam SW | ✅ |
| Versioned cache (v3.0.0) | ✅ |
| Button disable selepas submit | ✅ |
| Auto-enable button selepas 15s (anti-stuck) | ✅ |
| Chat unsubscribe on page unload | ✅ |
| Duplicate message prevention | ✅ |
| Empty state / Error state / Skeleton loader | ✅ |
| DEV_MODE — console.log hanya dalam dev | ✅ |
| Lazy loading images | ✅ |
| Cart persistence (localStorage + migration) | ✅ |
| CORS headers semua edge functions | ✅ |
| No secret keys dalam frontend | ✅ |
| No localStorage role storage | ✅ |
| Rate limiting table + function (SQL) | ✅ |
| Audit log table (SQL) | ✅ |
| Input validation constraints (SQL) | ✅ |
| Modular JS (9 modules dalam js/) | ✅ |
| Netlify redirect rules | ✅ |
| netlify.toml security headers | ✅ |

---

## ⚠️ PERLU BUAT MANUAL

### Image Optimization
Upload images dalam format WebP. Guna tools:
- [Squoosh.app](https://squoosh.app) — compress & convert ke WebP
- [TinyPNG](https://tinypng.com) — compress PNG/JPG

### Monitoring
Setup selepas deploy:
- Supabase Dashboard → Logs (monitor errors)
- Netlify Analytics (monitor traffic)
- Stripe Dashboard (monitor payments)

---

## 🚀 Deploy Command

```bash
# 1. Push ke GitHub
git add .
git commit -m "Production ready — auth, security, RLS, performance"
git push origin main

# 2. Netlify auto-deploy dari GitHub
# (setup di Netlify Dashboard → New Site from Git)
```

---

## 📊 Architecture Summary

```
SnapFlow/
├── app.js              ← Main bundle (5,934 lines) — load di semua pages
├── js/
│   ├── core.js         ← Config, auth, helpers (337 lines)
│   ├── feed.js         ← Video feed, like, comment (880 lines)
│   ├── upload.js       ← Upload, compress, rate limit (535 lines)
│   ├── profile.js      ← Profile, bio, verified (274 lines)
│   ├── shop.js         ← Shop, cart, Stripe (310 lines)
│   ├── chat.js         ← Chat, inbox, realtime (579 lines)
│   ├── discover.js     ← Search, trending (477 lines)
│   ├── social.js       ← Stories, reactions, duet (1,378 lines)
│   └── features.js     ← Analytics, AI, live (1,172 lines)
├── snapflow_supabase.sql ← Complete DB schema (1,013 lines)
├── netlify.toml        ← Deploy config
├── service-worker.js   ← PWA (v3.0.0)
└── [33 HTML pages]
```
