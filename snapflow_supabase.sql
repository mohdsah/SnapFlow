-- ============================================================
--  SNAPFLOW — SQL LENGKAP (VERSI BARU)
--  Salin SEMUA ini dan jalankan dalam Supabase SQL Editor
--  Jika ada error "already exists" — tidak mengapa, teruskan
-- ============================================================

-- ── 1. EXTENSIONS ────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 2. TABLE UTAMA (susunan betul: parent dulu) ──────────────

-- Videos (mesti PERTAMA — table lain rujuk ini)
CREATE TABLE IF NOT EXISTS public.videos (
    id            BIGSERIAL    PRIMARY KEY,
    user_id       UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    username      TEXT,
    video_url     TEXT         NOT NULL,
    caption       TEXT         DEFAULT '',
    likes_count   INTEGER      NOT NULL DEFAULT 0,
    is_pinned     BOOLEAN      NOT NULL DEFAULT false,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Likes
CREATE TABLE IF NOT EXISTS public.likes (
    id         BIGSERIAL    PRIMARY KEY,
    user_id    UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    video_id   BIGINT       NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, video_id)
);

-- Comments (dengan parent_id untuk Komen Berbalas)
CREATE TABLE IF NOT EXISTS public.comments (
    id           BIGSERIAL    PRIMARY KEY,
    video_id     BIGINT       NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
    user_id      UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    username     TEXT,
    comment_text TEXT         NOT NULL,
    parent_id    BIGINT       REFERENCES public.comments(id) ON DELETE CASCADE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Follows
CREATE TABLE IF NOT EXISTS public.follows (
    id           BIGSERIAL    PRIMARY KEY,
    follower_id  UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    following_id UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (follower_id, following_id),
    CHECK (follower_id <> following_id)
);

-- Messages
CREATE TABLE IF NOT EXISTS public.messages (
    id           BIGSERIAL    PRIMARY KEY,
    sender_id    UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id  UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message_text TEXT         NOT NULL,
    is_read      BOOLEAN      NOT NULL DEFAULT false,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id          BIGSERIAL    PRIMARY KEY,
    user_id     UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    from_user   UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
    type        TEXT         NOT NULL CHECK (type IN ('like','comment','follow','mention')),
    video_id    BIGINT       REFERENCES public.videos(id) ON DELETE CASCADE,
    message     TEXT,
    is_read     BOOLEAN      NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Reports
CREATE TABLE IF NOT EXISTS public.reports (
    id           BIGSERIAL    PRIMARY KEY,
    video_id     BIGINT       REFERENCES public.videos(id) ON DELETE CASCADE,
    reporter_id  UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
    reason       TEXT         NOT NULL,
    status       TEXT         NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','reviewed','dismissed')),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Reactions
CREATE TABLE IF NOT EXISTS public.reactions (
    id             BIGSERIAL    PRIMARY KEY,
    video_id       BIGINT       NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
    user_id        UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reaction_type  TEXT         NOT NULL
                                CHECK (reaction_type IN ('love','haha','fire','wow','star','sad')),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (video_id, user_id)
);

-- Stories (24 Jam) — TIDAK ada FK ke videos, hanya ke auth.users
CREATE TABLE IF NOT EXISTS public.stories (
    id          BIGSERIAL    PRIMARY KEY,
    user_id     UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    username    TEXT,
    media_url   TEXT         NOT NULL,
    media_type  TEXT         NOT NULL DEFAULT 'image'
                             CHECK (media_type IN ('image','video')),
    caption     TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── 3. INDEXES ───────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_videos_user_id      ON public.videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_created_at   ON public.videos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_likes        ON public.videos(likes_count DESC);

CREATE INDEX IF NOT EXISTS idx_likes_user_id       ON public.likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_video_id      ON public.likes(video_id);

CREATE INDEX IF NOT EXISTS idx_comments_video_id   ON public.comments(video_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id  ON public.comments(parent_id);

CREATE INDEX IF NOT EXISTS idx_follows_follower    ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following   ON public.follows(following_id);

CREATE INDEX IF NOT EXISTS idx_messages_sender     ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver   ON public.messages(receiver_id);

CREATE INDEX IF NOT EXISTS idx_notif_user_id       ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_is_read       ON public.notifications(is_read);

CREATE INDEX IF NOT EXISTS idx_reports_video_id    ON public.reports(video_id);
CREATE INDEX IF NOT EXISTS idx_reactions_video_id  ON public.reactions(video_id);
CREATE INDEX IF NOT EXISTS idx_stories_user_id     ON public.stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_created_at  ON public.stories(created_at DESC);

-- ── 4. FUNGSI RPC ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION increment_likes(row_id BIGINT)
RETURNS void AS $$
    UPDATE public.videos SET likes_count = likes_count + 1 WHERE id = row_id;
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_likes(row_id BIGINT)
RETURNS void AS $$
    UPDATE public.videos SET likes_count = GREATEST(0, likes_count - 1) WHERE id = row_id;
$$ LANGUAGE SQL SECURITY DEFINER;

-- ── 5. TRIGGER AUTO-NOTIFIKASI ───────────────────────────────

CREATE OR REPLACE FUNCTION create_like_notification()
RETURNS TRIGGER AS $$
DECLARE v_owner UUID;
BEGIN
    SELECT user_id INTO v_owner FROM public.videos WHERE id = NEW.video_id;
    IF v_owner IS NOT NULL AND v_owner <> NEW.user_id THEN
        INSERT INTO public.notifications(user_id, from_user, type, video_id, message)
        VALUES (v_owner, NEW.user_id, 'like', NEW.video_id, 'menyukai video anda');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_like_insert ON public.likes;
CREATE TRIGGER on_like_insert
    AFTER INSERT ON public.likes
    FOR EACH ROW EXECUTE FUNCTION create_like_notification();

CREATE OR REPLACE FUNCTION create_comment_notification()
RETURNS TRIGGER AS $$
DECLARE v_owner UUID;
BEGIN
    SELECT user_id INTO v_owner FROM public.videos WHERE id = NEW.video_id;
    IF v_owner IS NOT NULL AND v_owner <> NEW.user_id THEN
        INSERT INTO public.notifications(user_id, from_user, type, video_id, message)
        VALUES (v_owner, NEW.user_id, 'comment', NEW.video_id, 'mengomen video anda');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_comment_insert ON public.comments;
CREATE TRIGGER on_comment_insert
    AFTER INSERT ON public.comments
    FOR EACH ROW EXECUTE FUNCTION create_comment_notification();

CREATE OR REPLACE FUNCTION create_follow_notification()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notifications(user_id, from_user, type, message)
    VALUES (NEW.following_id, NEW.follower_id, 'follow', 'mula mengikuti anda');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_follow_insert ON public.follows;
CREATE TRIGGER on_follow_insert
    AFTER INSERT ON public.follows
    FOR EACH ROW EXECUTE FUNCTION create_follow_notification();

-- ── 6. ROW LEVEL SECURITY ────────────────────────────────────

ALTER TABLE public.videos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories     ENABLE ROW LEVEL SECURITY;

-- Videos RLS
CREATE POLICY "Semua boleh baca videos"
    ON public.videos FOR SELECT USING (true);
CREATE POLICY "User boleh upload video"
    ON public.videos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User boleh edit video sendiri"
    ON public.videos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "User boleh padam video sendiri"
    ON public.videos FOR DELETE USING (auth.uid() = user_id);

-- Likes RLS
CREATE POLICY "Semua boleh baca likes"
    ON public.likes FOR SELECT USING (true);
CREATE POLICY "User boleh like"
    ON public.likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User boleh unlike"
    ON public.likes FOR DELETE USING (auth.uid() = user_id);

-- Comments RLS
CREATE POLICY "Semua boleh baca komen"
    ON public.comments FOR SELECT USING (true);
CREATE POLICY "User boleh komen"
    ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User boleh padam komen sendiri"
    ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- Follows RLS
CREATE POLICY "Semua boleh baca follows"
    ON public.follows FOR SELECT USING (true);
CREATE POLICY "User boleh follow"
    ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "User boleh unfollow"
    ON public.follows FOR DELETE USING (auth.uid() = follower_id);

-- Messages RLS
CREATE POLICY "User boleh baca mesej sendiri"
    ON public.messages FOR SELECT
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "User boleh hantar mesej"
    ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Penerima boleh tandakan dibaca"
    ON public.messages FOR UPDATE USING (auth.uid() = receiver_id);

-- Notifications RLS
CREATE POLICY "User boleh baca notifikasi sendiri"
    ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "User boleh kemaskini notifikasi"
    ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Reports RLS
CREATE POLICY "User boleh hantar laporan"
    ON public.reports FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Reactions RLS
CREATE POLICY "Semua boleh baca reactions"
    ON public.reactions FOR SELECT USING (true);
CREATE POLICY "User boleh beri reaction"
    ON public.reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User boleh tukar reaction"
    ON public.reactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "User boleh buang reaction"
    ON public.reactions FOR DELETE USING (auth.uid() = user_id);

-- Stories RLS
CREATE POLICY "Semua boleh baca stories"
    ON public.stories FOR SELECT USING (true);
CREATE POLICY "User boleh upload stories"
    ON public.stories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User boleh padam stories sendiri"
    ON public.stories FOR DELETE USING (auth.uid() = user_id);

-- ── 7. REALTIME ──────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.videos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.follows;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stories;

-- ── 8. STORAGE BUCKETS ───────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('videos', 'videos', true, 52428800,
        ARRAY['video/mp4','video/webm','video/quicktime'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('images', 'images', true, 10485760,
        ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
DO $$ BEGIN
  CREATE POLICY "Public baca storage"
    ON storage.objects FOR SELECT USING (bucket_id IN ('videos','images'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Upload videos ke folder sendiri"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'videos'
      AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Upload images ke folder sendiri"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'images'
      AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Padam fail sendiri"
    ON storage.objects FOR DELETE
    USING (auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── SELESAI ──────────────────────────────────────────────────
-- 9 tables | 8 realtime | 2 storage buckets | 3 triggers
-- Semua dah siap!

-- ============================================================
-- KEMASKINI: Kolum Duet dalam videos
-- Jalankan ini jika table videos sudah wujud
-- ============================================================

ALTER TABLE public.videos
    ADD COLUMN IF NOT EXISTS is_duet         BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS duet_source_id  BIGINT REFERENCES public.videos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_videos_is_duet ON public.videos(is_duet) WHERE is_duet = true;

-- ============================================================
-- KEMASKINI: Jadual Publish + Verified dalam videos
-- ============================================================

ALTER TABLE public.videos
    ADD COLUMN IF NOT EXISTS scheduled_at  TIMESTAMPTZ DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS is_published  BOOLEAN     NOT NULL DEFAULT true;

-- Index untuk scheduled videos
CREATE INDEX IF NOT EXISTS idx_videos_scheduled
    ON public.videos(scheduled_at)
    WHERE is_published = false AND scheduled_at IS NOT NULL;

-- ============================================================
-- KEMASKINI: Push Tokens table (FCM)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.push_tokens (
    id          BIGSERIAL    PRIMARY KEY,
    user_id     UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token       TEXT         NOT NULL,
    platform    TEXT         DEFAULT 'web',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, token)
);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User boleh urus token sendiri"
    ON public.push_tokens FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- Filter video berjadual dari feed awam
-- Kemaskini Policy SELECT videos
-- ============================================================

-- Buang policy lama
DROP POLICY IF EXISTS "Semua boleh baca videos" ON public.videos;

-- Policy baru: hanya papar video yang dah published atau milik sendiri
CREATE POLICY "Semua boleh baca videos published"
    ON public.videos FOR SELECT
    USING (is_published = true OR auth.uid() = user_id);

-- ============================================================
-- KEMASKINI: Playlists & Playlist Videos
-- ============================================================

CREATE TABLE IF NOT EXISTS public.playlists (
    id          BIGSERIAL    PRIMARY KEY,
    user_id     UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    username    TEXT,
    title       TEXT         NOT NULL,
    description TEXT,
    cover_url   TEXT,
    is_public   BOOLEAN      NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.playlist_videos (
    id              BIGSERIAL    PRIMARY KEY,
    playlist_id     BIGINT       NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
    video_id        BIGINT       NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
    episode_number  INTEGER      NOT NULL DEFAULT 1,
    added_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (playlist_id, video_id)
);

CREATE INDEX IF NOT EXISTS idx_playlists_user_id    ON public.playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_plvids_playlist_id   ON public.playlist_videos(playlist_id);
CREATE INDEX IF NOT EXISTS idx_plvids_episode       ON public.playlist_videos(playlist_id, episode_number);

ALTER TABLE public.playlists       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Semua boleh baca playlists awam"
    ON public.playlists FOR SELECT USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "User boleh cipta playlist"
    ON public.playlists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User boleh kemaskini playlist sendiri"
    ON public.playlists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "User boleh padam playlist sendiri"
    ON public.playlists FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Semua boleh baca playlist videos"
    ON public.playlist_videos FOR SELECT USING (true);
CREATE POLICY "User boleh tambah video ke playlist sendiri"
    ON public.playlist_videos FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.playlists
        WHERE id = playlist_id AND user_id = auth.uid()
    ));
CREATE POLICY "User boleh padam dari playlist sendiri"
    ON public.playlist_videos FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM public.playlists
        WHERE id = playlist_id AND user_id = auth.uid()
    ));

-- Tambah ke Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.playlists;

-- ============================================================
-- KEMASKINI: Subscriptions (SnapFlow Pro)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.subscriptions (
    id                  BIGSERIAL    PRIMARY KEY,
    user_id             UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_customer_id  TEXT,
    stripe_sub_id       TEXT,
    status              TEXT         NOT NULL DEFAULT 'inactive'
                                     CHECK (status IN ('active','inactive','cancelled','past_due')),
    plan                TEXT         NOT NULL DEFAULT 'free'
                                     CHECK (plan IN ('free','pro')),
    current_period_end  TIMESTAMPTZ,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_subs_user_id  ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subs_status   ON public.subscriptions(status);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User boleh baca sub sendiri"
    ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
-- Insert/Update hanya melalui Edge Function (service_role)

-- ============================================================
-- KEMASKINI: Virtual Gifts / Hadiah
-- ============================================================

CREATE TABLE IF NOT EXISTS public.gifts (
    id               BIGSERIAL    PRIMARY KEY,
    video_id         BIGINT       REFERENCES public.videos(id) ON DELETE SET NULL,
    sender_id        UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id      UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    gift_type        TEXT         NOT NULL,
    coins_spent      INTEGER      NOT NULL DEFAULT 0,
    sender_username  TEXT,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gifts_receiver   ON public.gifts(receiver_id);
CREATE INDEX IF NOT EXISTS idx_gifts_video_id   ON public.gifts(video_id);
CREATE INDEX IF NOT EXISTS idx_gifts_created_at ON public.gifts(created_at);

ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User boleh baca hadiah yang diterima"
    ON public.gifts FOR SELECT USING (auth.uid() = receiver_id OR auth.uid() = sender_id);
CREATE POLICY "User boleh hantar hadiah"
    ON public.gifts FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Tambah ke Realtime untuk animasi hadiah masa nyata
ALTER PUBLICATION supabase_realtime ADD TABLE public.gifts;

-- ============================================================
-- KEMASKINI: User Profiles (bio + links)
-- ============================================================
-- Bio dan bio_links disimpan dalam auth.users user_metadata
-- Tiada table berasingan diperlukan — terus dalam Supabase Auth

-- ============================================================
-- KEMASKINI: Coins / Virtual Currency (ringkas)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.coin_transactions (
    id          BIGSERIAL    PRIMARY KEY,
    user_id     UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount      INTEGER      NOT NULL,
    type        TEXT         NOT NULL CHECK (type IN ('topup','spent','earned','bonus')),
    description TEXT,
    ref_id      BIGINT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coins_user_id ON public.coin_transactions(user_id);
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User boleh baca transaksi sendiri"
    ON public.coin_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Insert melalui service role sahaja"
    ON public.coin_transactions FOR INSERT WITH CHECK (false);
-- Gunakan service role dalam Edge Function untuk insert transaksi

-- ============================================================
-- SETUP: Supabase Auth OAuth
-- ============================================================
-- Untuk aktifkan Google + Apple login:
-- 1. Supabase Dashboard → Authentication → Providers
-- 2. GOOGLE: Aktifkan, isi Client ID + Secret dari Google Cloud Console
--    → https://console.cloud.google.com → APIs → Credentials → OAuth 2.0
--    → Redirect URL: https://<project>.supabase.co/auth/v1/callback
-- 3. APPLE: Aktifkan, isi Services ID + Key dari Apple Developer
--    → https://developer.apple.com → Certificates, IDs & Profiles
--    → Redirect URL: https://<project>.supabase.co/auth/v1/callback

-- ============================================================
-- KEMASKINI: Video Cabaran (#Challenge)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.challenges (
    id            BIGSERIAL    PRIMARY KEY,
    creator_id    UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
    creator_name  TEXT,
    title         TEXT         NOT NULL,
    hashtag       TEXT         NOT NULL UNIQUE,
    description   TEXT,
    emoji         TEXT         DEFAULT '🏆',
    prize         TEXT         DEFAULT 'SnapFlow Pro',
    entry_count   INTEGER      NOT NULL DEFAULT 0,
    ends_at       TIMESTAMPTZ,
    is_active     BOOLEAN      NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.challenge_entries (
    id           BIGSERIAL    PRIMARY KEY,
    challenge_id BIGINT       NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
    user_id      UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (challenge_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.challenge_participants (
    challenge_id BIGINT NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
    user_id      UUID   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    PRIMARY KEY (challenge_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_challenges_hashtag    ON public.challenges(hashtag);
CREATE INDEX IF NOT EXISTS idx_challenges_active     ON public.challenges(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_chal_entries_chal_id  ON public.challenge_entries(challenge_id);

ALTER TABLE public.challenges            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_entries     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Semua boleh baca cabaran aktif"
    ON public.challenges FOR SELECT USING (is_active = true);
CREATE POLICY "User boleh cipta cabaran"
    ON public.challenges FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creator boleh kemaskini cabaran sendiri"
    ON public.challenges FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Semua boleh baca entri"
    ON public.challenge_entries FOR SELECT USING (true);
CREATE POLICY "User boleh daftar entri"
    ON public.challenge_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Semua boleh baca peserta"
    ON public.challenge_participants FOR SELECT USING (true);
CREATE POLICY "User boleh daftar sebagai peserta"
    ON public.challenge_participants FOR INSERT WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.challenges;

-- ============================================================
-- KEMASKINI: Live Sessions
-- ============================================================

CREATE TABLE IF NOT EXISTS public.live_sessions (
    id            BIGSERIAL    PRIMARY KEY,
    session_id    TEXT         NOT NULL UNIQUE,
    host_id       UUID         REFERENCES auth.users(id) ON DELETE CASCADE,
    host_name     TEXT,
    title         TEXT,
    is_active     BOOLEAN      NOT NULL DEFAULT true,
    viewer_count  INTEGER      NOT NULL DEFAULT 0,
    started_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    ended_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_live_active    ON public.live_sessions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_live_host_id   ON public.live_sessions(host_id);

ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Semua boleh baca sesi live aktif"
    ON public.live_sessions FOR SELECT USING (is_active = true OR auth.uid() = host_id);
CREATE POLICY "Host boleh cipta sesi"
    ON public.live_sessions FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Host boleh kemaskini sesi sendiri"
    ON public.live_sessions FOR UPDATE USING (auth.uid() = host_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.live_sessions;

-- ============================================================
-- KEMASKINI: Video Shares Analytics
-- ============================================================

CREATE TABLE IF NOT EXISTS public.video_shares (
    id         BIGSERIAL    PRIMARY KEY,
    video_id   BIGINT       REFERENCES public.videos(id) ON DELETE CASCADE,
    platform   TEXT,
    shared_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shares_video_id  ON public.video_shares(video_id);
ALTER TABLE public.video_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Semua boleh insert share"
    ON public.video_shares FOR INSERT WITH CHECK (true);

-- ============================================================
-- SETUP: Edge Function Secrets
-- ============================================================
-- supabase secrets set OPENAI_API_KEY=sk-...      (Whisper Subtitle)
-- supabase secrets set ANTHROPIC_API_KEY=sk-ant-... (AI Caption)
-- supabase secrets set RESEND_API_KEY=re_...        (Email Laporan)
-- supabase secrets set STRIPE_SECRET_KEY=sk_live_...
-- supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
-- supabase secrets set APP_URL=https://snapflow-anda.netlify.app

-- ============================================================
-- KEMASKINI: Duet & Stitch tracking
-- ============================================================

ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS duet_from   BIGINT REFERENCES public.videos(id) ON DELETE SET NULL;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS stitch_from BIGINT REFERENCES public.videos(id) ON DELETE SET NULL;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS video_type  TEXT DEFAULT 'original' CHECK (video_type IN ('original','duet','stitch'));

CREATE INDEX IF NOT EXISTS idx_videos_duet_from   ON public.videos(duet_from)   WHERE duet_from IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_videos_stitch_from ON public.videos(stitch_from) WHERE stitch_from IS NOT NULL;

-- ============================================================
-- KEMASKINI: Search analytics (optional)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.search_queries (
    id         BIGSERIAL    PRIMARY KEY,
    query      TEXT         NOT NULL,
    user_id    UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
    results    INTEGER      DEFAULT 0,
    searched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_query ON public.search_queries(query);
ALTER TABLE public.search_queries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Insert search queries" ON public.search_queries FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin baca search queries" ON public.search_queries FOR SELECT USING (auth.uid() IS NOT NULL);
