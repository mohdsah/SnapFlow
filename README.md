# SKYNET v4.0

Platform video pendek bergaya TikTok dibina dengan HTML/CSS/JS + Supabase.

## Struktur Projek

```
SKYNET/
├── 📄 HTML Pages (33 files)
│   ├── index.html              # Home feed utama
│   ├── login.html              # Log masuk
│   ├── register.html           # Daftar akaun
│   ├── splash.html             # Loading / redirect
│   ├── forgot-password.html    # Reset kata laluan
│   ├── update-password.html    # Set kata laluan baru
│   ├── profile.html            # Profil pengguna
│   ├── edit-profile.html       # Edit profil
│   ├── upload.html             # Upload video
│   ├── editor.html             # Editor video
│   ├── duet.html               # Duet / Stitch
│   ├── live.html               # SKYNET Live
│   ├── discover.html           # Explore / Trending
│   ├── search.html             # Carian
│   ├── categories.html         # Kategori
│   ├── challenge.html          # Video cabaran
│   ├── chat.html               # Chat satu-satu
│   ├── inbox.html              # Inbox notifikasi
│   ├── shop.html               # Kedai produk
│   ├── product-detail.html     # Detail produk
│   ├── cart.html               # Troli beli-belah
│   ├── checkout.html           # Pembayaran Stripe
│   ├── order-success.html      # Berjaya bayar
│   ├── orders.html             # Senarai pesanan
│   ├── collections.html        # Koleksi video
│   ├── saved.html              # Video disimpan
│   ├── playlist.html           # Playlist
│   ├── followers.html          # Followers/Following
│   ├── analytics.html          # Analitik kreator
│   ├── activity-log.html       # Log aktiviti
│   ├── admin.html              # Panel admin
│   ├── offline.html            # Halaman offline
│   └── 404.html                # Halaman tidak dijumpai
│
├── 📦 JavaScript
│   ├── app.js                  # Semua logic (49 sections, 231 functions)
│   └── auth-guard.js           # Central auth guard
│
├── 🎨 Styles
│   └── style.css               # Semua CSS
│
├── ⚙️ Config
│   ├── manifest.json           # PWA manifest
│   ├── netlify.toml            # Netlify deployment
│   └── service-worker.js       # PWA offline + push notif
│
├── 🗄️ Database
│   └── skynet_supabase.sql   # Schema + 65 RLS policies
│
└── ☁️ Edge Functions (Supabase)
    └── supabase/functions/
        ├── create-checkout/    # Stripe payment (harga dari DB)
        ├── stripe-webhook/     # Payment webhook handler
        ├── publish-scheduled/  # Auto-publish video (cron)
        ├── generate-caption/   # AI caption (Claude API)
        ├── generate-subtitle/  # AI subtitle
        ├── weekly-report/      # Laporan mingguan (email)
        └── cleanup-stories/    # Auto-hapus stories expired
```

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend | Vanilla HTML/CSS/JS (no framework) |
| Backend | Supabase (PostgreSQL + Auth + Realtime + Storage) |
| Payments | Stripe Checkout |
| AI | Anthropic Claude API |
| Hosting | Netlify |
| PWA | Service Worker + Web Push |

## Features

- 🎬 Upload & tonton video (TikTok-style feed)
- 👤 Auth lengkap (email, Google, Apple OAuth)
- 💬 Realtime chat + notifikasi
- 🛒 E-commerce dengan Stripe
- 📊 Dashboard analitik kreator
- 🔴 Live streaming (SKYNET Live)
- 🎯 Video cabaran & duet
- 📱 PWA (installable, offline support, push notifications)
- 🔒 26 tables dengan 65 RLS policies

## Quick Start

1. Run `skynet_supabase.sql` dalam Supabase SQL Editor
2. Kemaskini `supabaseUrl` dan `supabaseKey` dalam `app.js`
3. Deploy Edge Functions: `npx supabase functions deploy --all`
4. Set secrets (lihat `DEPLOY.md`)
5. Deploy ke Netlify

Lihat `DEPLOY.md` untuk panduan lengkap.

## Keselamatan

- ✅ Tiada secret key dalam frontend
- ✅ Harga Stripe divalidasi server-side
- ✅ JWT verification dalam semua Edge Functions
- ✅ Auth guard untuk semua halaman protected
- ✅ Admin role diverifikasi dari database
- ✅ RLS aktif untuk semua 26 tables
