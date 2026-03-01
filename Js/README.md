# SnapFlow — Modular JavaScript Architecture

## Struktur

```
app.js          ← Main file (full bundle, backward compatible)
js/
├── core.js     ← Config Supabase, helpers, auth, session (lines 1-1905)
├── feed.js     ← Video feed, like, follow, comments, observer, progress bar
├── upload.js   ← Upload video, compression, rate limit, thumbnail, schedule
├── profile.js  ← Profile, edit profile, verified badge, bio links, activity log
├── shop.js     ← Shop, cart, checkout, Stripe Pro
├── chat.js     ← Chat, inbox, notifications, realtime push
├── discover.js ← Search, discover, creator search, leaderboard
├── social.js   ← Reactions, mentions, stories, duet, blocks, gifts, challenges
└── features.js ← Analytics, AI caption, weekly report, live, subtitle, DOM pruning
```

## Cara Guna (Masa Depan)

Untuk load hanya modul yang diperlukan pada sesuatu page:

```html
<!-- Core wajib ada di semua page -->
<script src="js/core.js"></script>

<!-- Load hanya modul yang relevan -->
<script src="js/feed.js"></script>  <!-- untuk index.html -->
<script src="js/shop.js"></script>  <!-- untuk shop.html -->
```

## Status Sekarang

`app.js` masih digunakan sebagai **single bundle** untuk keserasian.
Module files dalam `js/` adalah untuk:
1. Rujukan dan dokumentasi
2. Debugging — tengok hanya bahagian berkaitan
3. Migrasi masa depan ke full SPA

## Module Dependencies

```
core.js
└── diperlukan oleh SEMUA module lain

feed.js
└── bergantung kepada: core.js

social.js
└── bergantung kepada: core.js, feed.js

features.js
└── bergantung kepada: core.js, feed.js, profile.js
```

## Performance Stats

| Module     | Lines | Saiz   | Fungsi |
|------------|-------|--------|--------|
| core.js    | 207   | ~8KB   | Auth, helpers |
| feed.js    | 883   | ~35KB  | Video, like, comment |
| upload.js  | 538   | ~22KB  | Upload, compress |
| profile.js | 277   | ~11KB  | Profile |
| shop.js    | 313   | ~13KB  | Shop, cart |
| chat.js    | 569   | ~23KB  | Chat, notif |
| discover.js| 480   | ~19KB  | Search, trending |
| social.js  | 1381  | ~55KB  | Reactions, stories, duet |
| features.js| 1175  | ~47KB  | Analytics, AI, live |
| **TOTAL**  | **5823** | **~233KB** | |
