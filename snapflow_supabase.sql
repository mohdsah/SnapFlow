-- ============================================================
--  SNAPFLOW — Complete Database Schema
--  Supabase PostgreSQL
--  Termasuk: Tables, RLS Policies, Indexes, Triggers
-- ============================================================

-- ── Extensions ───────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";  -- For fuzzy text search

-- ============================================================
-- TABLE: profiles
-- ============================================================
create table if not exists profiles (
    id            uuid references auth.users(id) on delete cascade primary key,
    username      text unique not null,
    full_name     text,
    avatar_url    text,
    bio           text,
    website       text,
    role          text default 'user' check (role in ('user','admin','moderator')),
    is_admin      boolean default false,
    is_verified   boolean default false,
    is_pro        boolean default false,
    pro_expires_at timestamptz,
    follower_count integer default 0,
    following_count integer default 0,
    video_count   integer default 0,
    created_at    timestamptz default now(),
    updated_at    timestamptz default now()
);

alter table profiles enable row level security;

-- Siapa boleh baca profil?
create policy "profiles: public can read"
    on profiles for select using (true);

-- Hanya pemilik boleh update profil sendiri
create policy "profiles: owner can update"
    on profiles for update
    using (auth.uid() = id)
    with check (auth.uid() = id);

-- Profil dicipta auto bila user register (via trigger)
create policy "profiles: owner can insert own"
    on profiles for insert
    with check (auth.uid() = id);

-- Admin boleh update mana-mana profil
create policy "profiles: admin can update all"
    on profiles for update
    using (
        exists (
            select 1 from profiles
            where id = auth.uid() and (role = 'admin' or is_admin = true)
        )
    );

-- ── Auto-create profile on signup ────────────────
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
declare
    v_username text;
    v_base     text;
    v_count    integer := 0;
begin
    -- Ambil username dari metadata (dihantar oleh app) atau jana dari email
    v_base := coalesce(
        nullif(trim(new.raw_user_meta_data->>'username'), ''),
        regexp_replace(lower(split_part(new.email, '@', 1)), '[^a-z0-9_.]', '_', 'g')
    );

    -- Pastikan panjang minimum
    v_base := substring(lower(v_base) from 1 for 25);
    if length(v_base) < 3 then v_base := 'user_' || v_base; end if;

    -- Cari username unik (tambah nombor jika sudah ada)
    v_username := v_base;
    loop
        exit when not exists (select 1 from profiles where username = v_username);
        v_count    := v_count + 1;
        v_username := v_base || v_count::text;
        exit when v_count > 9999;
    end loop;

    insert into profiles (id, username, full_name, avatar_url)
    values (
        new.id,
        v_username,
        coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), ''),
        coalesce(new.raw_user_meta_data->>'avatar_url', '')
    )
    on conflict (id) do nothing;

    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function handle_new_user();

-- ── Auto-update updated_at ────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_updated_at
    before update on profiles
    for each row execute function update_updated_at();

-- ============================================================
-- TABLE: videos
-- ============================================================
create table if not exists videos (
    id              bigserial primary key,
    user_id         uuid references profiles(id) on delete cascade not null,
    username        text,
    video_url       text not null,
    thumbnail_url   text,
    caption         text default '',
    likes_count     integer default 0,
    comments_count  integer default 0,
    shares_count    integer default 0,
    saves_count     integer default 0,
    views_count     integer default 0,
    is_pinned       boolean default false,
    is_published    boolean default true,
    video_type      text default 'original' check (video_type in ('original','duet','stitch')),
    duet_from       bigint references videos(id) on delete set null,
    stitch_from     bigint references videos(id) on delete set null,
    scheduled_at    timestamptz,
    published_at    timestamptz default now(),
    created_at      timestamptz default now()
);

alter table videos enable row level security;

-- Semua boleh tengok video yang published
create policy "videos: public can read published"
    on videos for select
    using (is_published = true or auth.uid() = user_id);

-- Hanya pemilik boleh upload video sendiri
create policy "videos: owner can insert"
    on videos for insert
    with check (auth.uid() = user_id);

-- Hanya pemilik boleh update video sendiri
create policy "videos: owner can update"
    on videos for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Hanya pemilik boleh padam video sendiri
create policy "videos: owner can delete"
    on videos for delete
    using (auth.uid() = user_id);

-- Admin boleh padam mana-mana video
create policy "videos: admin can delete all"
    on videos for delete
    using (
        exists (
            select 1 from profiles
            where id = auth.uid() and (role = 'admin' or is_admin = true)
        )
    );

-- ============================================================
-- TABLE: likes
-- ============================================================
create table if not exists likes (
    id         bigserial primary key,
    user_id    uuid references profiles(id) on delete cascade not null,
    video_id   bigint references videos(id) on delete cascade not null,
    created_at timestamptz default now(),
    unique(user_id, video_id)
);

alter table likes enable row level security;

create policy "likes: public can read"
    on likes for select using (true);

create policy "likes: user can like"
    on likes for insert
    with check (auth.uid() = user_id);

create policy "likes: user can unlike own"
    on likes for delete
    using (auth.uid() = user_id);

-- Auto-update likes_count on videos
create or replace function update_likes_count()
returns trigger language plpgsql as $$
begin
    if TG_OP = 'INSERT' then
        update videos set likes_count = likes_count + 1 where id = new.video_id;
    elsif TG_OP = 'DELETE' then
        update videos set likes_count = greatest(0, likes_count - 1) where id = old.video_id;
    end if;
    return coalesce(new, old);
end;
$$;

drop trigger if exists likes_count_trigger on likes;
create trigger likes_count_trigger
    after insert or delete on likes
    for each row execute function update_likes_count();

-- ============================================================
-- TABLE: comments
-- ============================================================
create table if not exists comments (
    id           bigserial primary key,
    video_id     bigint references videos(id) on delete cascade not null,
    user_id      uuid references profiles(id) on delete cascade not null,
    username     text,
    comment_text text not null,
    parent_id    bigint references comments(id) on delete cascade,
    likes_count  integer default 0,
    created_at   timestamptz default now()
);

alter table comments enable row level security;

create policy "comments: public can read"
    on comments for select using (true);

create policy "comments: user can comment"
    on comments for insert
    with check (auth.uid() = user_id);

create policy "comments: owner can delete own"
    on comments for delete
    using (auth.uid() = user_id);

-- Admin atau video owner boleh padam komen
create policy "comments: admin or video owner can delete"
    on comments for delete
    using (
        exists (select 1 from videos where id = comments.video_id and user_id = auth.uid())
        or
        exists (select 1 from profiles where id = auth.uid() and (role = 'admin' or is_admin = true))
    );

-- Auto-update comments_count
create or replace function update_comments_count()
returns trigger language plpgsql as $$
begin
    if TG_OP = 'INSERT' then
        update videos set comments_count = comments_count + 1 where id = new.video_id;
    elsif TG_OP = 'DELETE' then
        update videos set comments_count = greatest(0, comments_count - 1) where id = old.video_id;
    end if;
    return coalesce(new, old);
end;
$$;

drop trigger if exists comments_count_trigger on comments;
create trigger comments_count_trigger
    after insert or delete on comments
    for each row execute function update_comments_count();

-- ============================================================
-- TABLE: follows
-- ============================================================
create table if not exists follows (
    id           bigserial primary key,
    follower_id  uuid references profiles(id) on delete cascade not null,
    following_id uuid references profiles(id) on delete cascade not null,
    created_at   timestamptz default now(),
    unique(follower_id, following_id),
    check (follower_id != following_id)
);

alter table follows enable row level security;

create policy "follows: public can read"
    on follows for select using (true);

create policy "follows: user can follow"
    on follows for insert
    with check (auth.uid() = follower_id);

create policy "follows: user can unfollow own"
    on follows for delete
    using (auth.uid() = follower_id);

-- Auto-update follower/following count
create or replace function update_follow_counts()
returns trigger language plpgsql as $$
begin
    if TG_OP = 'INSERT' then
        update profiles set following_count = following_count + 1 where id = new.follower_id;
        update profiles set follower_count  = follower_count  + 1 where id = new.following_id;
    elsif TG_OP = 'DELETE' then
        update profiles set following_count = greatest(0, following_count - 1) where id = old.follower_id;
        update profiles set follower_count  = greatest(0, follower_count  - 1) where id = old.following_id;
    end if;
    return coalesce(new, old);
end;
$$;

drop trigger if exists follows_count_trigger on follows;
create trigger follows_count_trigger
    after insert or delete on follows
    for each row execute function update_follow_counts();

-- ============================================================
-- TABLE: notifications
-- ============================================================
create table if not exists notifications (
    id           bigserial primary key,
    user_id      uuid references profiles(id) on delete cascade not null,
    from_user_id uuid references profiles(id) on delete cascade,
    type         text not null check (type in ('like','comment','follow','mention','gift','challenge','live','reply')),
    content      text,
    video_id     bigint references videos(id) on delete cascade,
    is_read      boolean default false,
    created_at   timestamptz default now()
);

alter table notifications enable row level security;

-- Hanya pemilik boleh baca notifikasi sendiri
create policy "notifications: owner can read own"
    on notifications for select
    using (auth.uid() = user_id);

create policy "notifications: system can insert"
    on notifications for insert
    with check (true);

create policy "notifications: owner can update (mark read)"
    on notifications for update
    using (auth.uid() = user_id);

create policy "notifications: owner can delete own"
    on notifications for delete
    using (auth.uid() = user_id);

-- ============================================================
-- TABLE: messages (Chat)
-- ============================================================
create table if not exists messages (
    id           bigserial primary key,
    room_id      text not null,
    sender_id    uuid references profiles(id) on delete cascade not null,
    content      text not null,
    is_read      boolean default false,
    created_at   timestamptz default now()
);

alter table messages enable row level security;

-- User hanya boleh baca mesej dalam room yang mereka terlibat
create policy "messages: participant can read"
    on messages for select
    using (
        room_id like '%' || auth.uid()::text || '%'
    );

create policy "messages: user can send"
    on messages for insert
    with check (auth.uid() = sender_id);

create policy "messages: sender can delete own"
    on messages for delete
    using (auth.uid() = sender_id);

-- ============================================================
-- TABLE: products (Shop)
-- ============================================================
create table if not exists products (
    id           bigserial primary key,
    seller_id    uuid references profiles(id) on delete cascade not null,
    name         text not null,
    description  text,
    price        decimal(10,2) not null check (price >= 0),
    stock        integer default 0 check (stock >= 0),
    category     text,
    image_url    text,
    is_active    boolean default true,
    sales_count  integer default 0,
    created_at   timestamptz default now()
);

alter table products enable row level security;

create policy "products: public can read active"
    on products for select
    using (is_active = true or auth.uid() = seller_id);

create policy "products: seller can insert"
    on products for insert
    with check (auth.uid() = seller_id);

create policy "products: seller can update own"
    on products for update
    using (auth.uid() = seller_id);

create policy "products: admin can manage all"
    on products for all
    using (
        exists (select 1 from profiles where id = auth.uid() and (role = 'admin' or is_admin = true))
    );

-- ============================================================
-- TABLE: orders
-- ============================================================
create table if not exists orders (
    id              bigserial primary key,
    buyer_id        uuid references profiles(id) on delete cascade not null,
    product_id      bigint references products(id) on delete set null,
    quantity        integer not null default 1 check (quantity > 0),
    unit_price      decimal(10,2) not null,
    total_price     decimal(10,2) not null,
    status          text default 'pending' check (status in ('pending','paid','shipped','delivered','cancelled','refunded')),
    stripe_session_id text,
    shipping_address jsonb,
    created_at      timestamptz default now()
);

alter table orders enable row level security;

-- Pembeli boleh baca pesanan sendiri
create policy "orders: buyer can read own"
    on orders for select
    using (auth.uid() = buyer_id);

-- Penjual boleh baca pesanan produk mereka
create policy "orders: seller can read their orders"
    on orders for select
    using (
        exists (select 1 from products where id = orders.product_id and seller_id = auth.uid())
    );

create policy "orders: user can create order"
    on orders for insert
    with check (auth.uid() = buyer_id);

-- Admin boleh baca semua
create policy "orders: admin can read all"
    on orders for select
    using (
        exists (select 1 from profiles where id = auth.uid() and (role = 'admin' or is_admin = true))
    );

create policy "orders: admin can update status"
    on orders for update
    using (
        exists (select 1 from profiles where id = auth.uid() and (role = 'admin' or is_admin = true))
    );

-- ============================================================
-- TABLE: reports (Video Reports)
-- ============================================================
create table if not exists reports (
    id          bigserial primary key,
    reporter_id uuid references profiles(id) on delete cascade not null,
    video_id    bigint references videos(id) on delete cascade,
    user_id     uuid references profiles(id) on delete cascade,
    reason      text not null,
    status      text default 'pending' check (status in ('pending','reviewed','dismissed','actioned')),
    reviewed_by uuid references profiles(id),
    reviewed_at timestamptz,
    created_at  timestamptz default now()
);

alter table reports enable row level security;

create policy "reports: user can submit"
    on reports for insert
    with check (auth.uid() = reporter_id);

-- Hanya admin boleh baca dan update laporan
create policy "reports: admin can read all"
    on reports for select
    using (
        exists (select 1 from profiles where id = auth.uid() and (role = 'admin' or is_admin = true))
    );

create policy "reports: admin can update"
    on reports for update
    using (
        exists (select 1 from profiles where id = auth.uid() and (role = 'admin' or is_admin = true))
    );

create policy "reports: admin can delete"
    on reports for delete
    using (
        exists (select 1 from profiles where id = auth.uid() and (role = 'admin' or is_admin = true))
    );

-- ============================================================
-- TABLE: stories (24-hour Stories)
-- ============================================================
create table if not exists stories (
    id          bigserial primary key,
    user_id     uuid references profiles(id) on delete cascade not null,
    media_url   text not null,
    media_type  text default 'image' check (media_type in ('image','video')),
    caption     text,
    views_count integer default 0,
    expires_at  timestamptz default (now() + interval '24 hours'),
    created_at  timestamptz default now()
);

alter table stories enable row level security;

-- Semua boleh baca stories yang belum expired
create policy "stories: public can read active"
    on stories for select
    using (expires_at > now() or auth.uid() = user_id);

create policy "stories: user can create own"
    on stories for insert
    with check (auth.uid() = user_id);

create policy "stories: owner can delete own"
    on stories for delete
    using (auth.uid() = user_id);

-- ============================================================
-- TABLE: reactions
-- ============================================================
create table if not exists reactions (
    id         bigserial primary key,
    video_id   bigint references videos(id) on delete cascade not null,
    user_id    uuid references profiles(id) on delete cascade not null,
    emoji      text not null,
    created_at timestamptz default now(),
    unique(video_id, user_id, emoji)
);

alter table reactions enable row level security;

create policy "reactions: public can read" on reactions for select using (true);

create policy "reactions: user can react"
    on reactions for insert
    with check (auth.uid() = user_id);

create policy "reactions: user can remove own"
    on reactions for delete
    using (auth.uid() = user_id);

-- ============================================================
-- TABLE: challenges
-- ============================================================
create table if not exists challenges (
    id           bigserial primary key,
    creator_id   uuid references profiles(id) on delete cascade not null,
    title        text not null,
    description  text,
    hashtag      text unique not null,
    prize        text,
    emoji        text default '🏆',
    entry_count  integer default 0,
    ends_at      timestamptz,
    created_at   timestamptz default now()
);

alter table challenges enable row level security;

create policy "challenges: public can read" on challenges for select using (true);

create policy "challenges: user can create"
    on challenges for insert
    with check (auth.uid() = creator_id);

create policy "challenges: creator can update own"
    on challenges for update
    using (auth.uid() = creator_id);

create policy "challenges: admin can manage"
    on challenges for all
    using (
        exists (select 1 from profiles where id = auth.uid() and (role = 'admin' or is_admin = true))
    );

-- ============================================================
-- TABLE: challenge_entries
-- ============================================================
create table if not exists challenge_entries (
    id           bigserial primary key,
    challenge_id bigint references challenges(id) on delete cascade not null,
    user_id      uuid references profiles(id) on delete cascade not null,
    video_id     bigint references videos(id) on delete cascade,
    created_at   timestamptz default now(),
    unique(challenge_id, user_id)
);

alter table challenge_entries enable row level security;

create policy "challenge_entries: public can read" on challenge_entries for select using (true);

create policy "challenge_entries: user can join"
    on challenge_entries for insert
    with check (auth.uid() = user_id);

-- ============================================================
-- TABLE: live_sessions
-- ============================================================
create table if not exists live_sessions (
    id            bigserial primary key,
    session_id    text unique not null,
    host_id       uuid references profiles(id) on delete cascade not null,
    host_name     text,
    title         text,
    is_active     boolean default true,
    viewer_count  integer default 0,
    peak_viewers  integer default 0,
    started_at    timestamptz default now(),
    ended_at      timestamptz
);

alter table live_sessions enable row level security;

create policy "live_sessions: public can read active"
    on live_sessions for select
    using (is_active = true or auth.uid() = host_id);

create policy "live_sessions: user can host"
    on live_sessions for insert
    with check (auth.uid() = host_id);

create policy "live_sessions: host can update own"
    on live_sessions for update
    using (auth.uid() = host_id);

-- ============================================================
-- TABLE: gifts / tips
-- ============================================================
create table if not exists gifts (
    id           bigserial primary key,
    sender_id    uuid references profiles(id) on delete cascade not null,
    receiver_id  uuid references profiles(id) on delete cascade not null,
    video_id     bigint references videos(id) on delete set null,
    emoji        text not null,
    name         text,
    coins        integer not null check (coins > 0),
    created_at   timestamptz default now()
);

alter table gifts enable row level security;

-- Pengirim dan penerima boleh baca
create policy "gifts: participant can read"
    on gifts for select
    using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "gifts: user can send"
    on gifts for insert
    with check (auth.uid() = sender_id);

-- ============================================================
-- TABLE: blocked_users
-- ============================================================
create table if not exists blocked_users (
    id          bigserial primary key,
    user_id     uuid references profiles(id) on delete cascade not null,
    blocked_id  uuid references profiles(id) on delete cascade not null,
    created_at  timestamptz default now(),
    unique(user_id, blocked_id),
    check (user_id != blocked_id)
);

alter table blocked_users enable row level security;

-- Hanya pemilik boleh baca senarai block mereka
create policy "blocked_users: owner can read own"
    on blocked_users for select
    using (auth.uid() = user_id);

create policy "blocked_users: user can block"
    on blocked_users for insert
    with check (auth.uid() = user_id);

create policy "blocked_users: user can unblock own"
    on blocked_users for delete
    using (auth.uid() = user_id);

-- ============================================================
-- TABLE: playlists
-- ============================================================
create table if not exists playlists (
    id           bigserial primary key,
    user_id      uuid references profiles(id) on delete cascade not null,
    title        text not null,
    description  text,
    cover_url    text,
    is_public    boolean default true,
    video_count  integer default 0,
    created_at   timestamptz default now()
);

alter table playlists enable row level security;

create policy "playlists: public can read public"
    on playlists for select
    using (is_public = true or auth.uid() = user_id);

create policy "playlists: user can create own"
    on playlists for insert
    with check (auth.uid() = user_id);

create policy "playlists: owner can manage"
    on playlists for all
    using (auth.uid() = user_id);

-- ============================================================
-- TABLE: playlist_videos
-- ============================================================
create table if not exists playlist_videos (
    id          bigserial primary key,
    playlist_id bigint references playlists(id) on delete cascade not null,
    video_id    bigint references videos(id) on delete cascade not null,
    position    integer default 0,
    added_at    timestamptz default now(),
    unique(playlist_id, video_id)
);

alter table playlist_videos enable row level security;

create policy "playlist_videos: read if playlist public"
    on playlist_videos for select
    using (
        exists (
            select 1 from playlists
            where id = playlist_videos.playlist_id
            and (is_public = true or user_id = auth.uid())
        )
    );

create policy "playlist_videos: playlist owner can manage"
    on playlist_videos for all
    using (
        exists (select 1 from playlists where id = playlist_videos.playlist_id and user_id = auth.uid())
    );

-- ============================================================
-- TABLE: search_queries (Analytics)
-- ============================================================
create table if not exists search_queries (
    id         bigserial primary key,
    user_id    uuid references profiles(id) on delete set null,
    query      text not null,
    results    integer default 0,
    created_at timestamptz default now()
);

alter table search_queries enable row level security;

-- Admin sahaja boleh baca analytics carian
create policy "search_queries: admin can read"
    on search_queries for select
    using (
        exists (select 1 from profiles where id = auth.uid() and (role = 'admin' or is_admin = true))
    );

create policy "search_queries: anyone can insert"
    on search_queries for insert with check (true);

-- ============================================================
-- TABLE: coins (Virtual Currency)
-- ============================================================
create table if not exists coins (
    id         uuid references profiles(id) on delete cascade primary key,
    balance    integer default 0 check (balance >= 0),
    updated_at timestamptz default now()
);

alter table coins enable row level security;

-- Hanya pemilik boleh baca baki syiling sendiri
create policy "coins: owner can read own"
    on coins for select
    using (auth.uid() = id);

-- System sahaja boleh update (via service role)
create policy "coins: system can manage"
    on coins for all
    using (
        exists (select 1 from profiles where id = auth.uid() and (role = 'admin' or is_admin = true))
    );

-- ============================================================
-- INDEXES — Performance
-- ============================================================

-- Videos
create index if not exists idx_videos_user_id        on videos(user_id);
create index if not exists idx_videos_published_at   on videos(published_at desc);
create index if not exists idx_videos_is_published   on videos(is_published);
create index if not exists idx_videos_caption_fts    on videos using gin(to_tsvector('english', coalesce(caption,'')));
create index if not exists idx_videos_caption_trgm   on videos using gin(caption gin_trgm_ops);

-- Likes
create index if not exists idx_likes_video_id  on likes(video_id);
create index if not exists idx_likes_user_id   on likes(user_id);

-- Comments
create index if not exists idx_comments_video_id  on comments(video_id);
create index if not exists idx_comments_parent_id on comments(parent_id);

-- Follows
create index if not exists idx_follows_follower_id  on follows(follower_id);
create index if not exists idx_follows_following_id on follows(following_id);

-- Notifications
create index if not exists idx_notifications_user_id   on notifications(user_id);
create index if not exists idx_notifications_is_read   on notifications(is_read);
create index if not exists idx_notifications_created   on notifications(created_at desc);

-- Messages
create index if not exists idx_messages_room_id    on messages(room_id);
create index if not exists idx_messages_sender_id  on messages(sender_id);
create index if not exists idx_messages_created    on messages(created_at desc);

-- Stories
create index if not exists idx_stories_user_id    on stories(user_id);
create index if not exists idx_stories_expires_at on stories(expires_at);

-- Profiles
create index if not exists idx_profiles_username  on profiles(username);
create index if not exists idx_profiles_role      on profiles(role);
create unique index if not exists idx_profiles_username_lower on profiles(lower(username));

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
-- Run these in Supabase Dashboard → Storage

-- insert into storage.buckets (id, name, public)
-- values ('videos', 'videos', true);

-- insert into storage.buckets (id, name, public)
-- values ('avatars', 'avatars', true);

-- insert into storage.buckets (id, name, public)
-- values ('stories', 'stories', true);

-- insert into storage.buckets (id, name, public)
-- values ('thumbnails', 'thumbnails', true);

-- Storage Policies (run in Supabase Dashboard → Storage → Policies)
-- atau guna SQL di bawah:

create policy "videos bucket: public read"
    on storage.objects for select
    using (bucket_id = 'videos');

create policy "videos bucket: auth user upload"
    on storage.objects for insert
    with check (
        bucket_id = 'videos'
        and auth.role() = 'authenticated'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

create policy "videos bucket: owner delete"
    on storage.objects for delete
    using (
        bucket_id = 'videos'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

create policy "avatars bucket: public read"
    on storage.objects for select
    using (bucket_id = 'avatars');

create policy "avatars bucket: auth user upload"
    on storage.objects for insert
    with check (
        bucket_id = 'avatars'
        and auth.role() = 'authenticated'
    );

create policy "avatars bucket: owner update"
    on storage.objects for update
    using (
        bucket_id = 'avatars'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

create policy "stories bucket: public read"
    on storage.objects for select
    using (bucket_id = 'stories');

create policy "stories bucket: auth upload"
    on storage.objects for insert
    with check (
        bucket_id = 'stories'
        and auth.role() = 'authenticated'
    );

-- ============================================================
-- REALTIME — Enable untuk tables tertentu sahaja
-- ============================================================
-- Run in Supabase Dashboard → Database → Replication

-- alter publication supabase_realtime add table likes;
-- alter publication supabase_realtime add table comments;
-- alter publication supabase_realtime add table notifications;
-- alter publication supabase_realtime add table messages;
-- alter publication supabase_realtime add table follows;
-- alter publication supabase_realtime add table live_sessions;

-- ============================================================
-- ADMIN SETUP — Beri role admin kepada user pertama
-- ============================================================
-- Ganti 'your-email@example.com' dengan emel anda:
--
-- update profiles set role = 'admin', is_admin = true
-- where id = (select id from auth.users where email = 'your-email@example.com');
--
-- ATAU guna Supabase Dashboard → Table Editor → profiles
-- cari row user anda → set role = 'admin', is_admin = true

-- ============================================================
-- SECURITY: Rate Limiting
-- ============================================================
CREATE TABLE IF NOT EXISTS rate_limits (
    id          BIGSERIAL PRIMARY KEY,
    user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
    action      TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rate_limits: user can read own"
    ON rate_limits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "rate_limits: system insert"
    ON rate_limits FOR INSERT WITH CHECK (true);

CREATE OR REPLACE FUNCTION check_rate_limit(
    p_user_id UUID, p_action TEXT, p_limit INT, p_window INTERVAL
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_count INT;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM rate_limits
    WHERE user_id = p_user_id AND action = p_action
      AND created_at > NOW() - p_window;
    RETURN v_count < p_limit;
END; $$;

CREATE INDEX IF NOT EXISTS idx_rate_limits_user ON rate_limits(user_id, action, created_at);

-- ============================================================
-- SECURITY: Audit Log
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id          BIGSERIAL PRIMARY KEY,
    user_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action      TEXT NOT NULL,
    table_name  TEXT,
    record_id   TEXT,
    details     JSONB,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs: admin read only"
    ON audit_logs FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid()
        AND (role = 'admin' OR is_admin = TRUE)
    ));
CREATE POLICY "audit_logs: system insert"
    ON audit_logs FOR INSERT WITH CHECK (TRUE);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user    ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- ============================================================
-- SECURITY: Input Validation Constraints
-- ============================================================
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_username_format;
ALTER TABLE profiles ADD CONSTRAINT profiles_username_format
    CHECK (username ~ '^[a-zA-Z0-9_.-]{3,30}$');

ALTER TABLE videos DROP CONSTRAINT IF EXISTS videos_caption_length;
ALTER TABLE videos ADD CONSTRAINT videos_caption_length
    CHECK (CHAR_LENGTH(caption) <= 2200);

ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_text_length;
ALTER TABLE comments ADD CONSTRAINT comments_text_length
    CHECK (CHAR_LENGTH(comment_text) <= 500);

-- ============================================================
-- VIEWS: Admin Dashboard
-- ============================================================
CREATE OR REPLACE VIEW admin_video_stats AS
    SELECT
        v.id, v.caption, v.likes_count, v.comments_count, v.views_count,
        v.created_at, v.is_published,
        p.username, p.is_verified,
        (v.likes_count + v.comments_count * 2 + v.shares_count * 3) AS engagement_score
    FROM videos v
    JOIN profiles p ON p.id = v.user_id
    WHERE v.created_at > NOW() - INTERVAL '30 days'
    ORDER BY engagement_score DESC;

-- ============================================================
-- STEPS SELEPAS RUN SQL (BACA INI!)
-- ============================================================
-- 1. Enable Realtime:
--    Dashboard > Database > Replication > add tables:
--    likes, comments, notifications, messages, follows, live_sessions

-- 2. Storage Buckets (Dashboard > Storage > New Bucket):
--    "videos"     - public, max 500MB
--    "avatars"    - public, max 5MB
--    "stories"    - public, max 50MB
--    "thumbnails" - public, max 5MB

-- 3. Set Admin (ganti emel):
--    UPDATE profiles SET role='admin', is_admin=TRUE
--    WHERE id=(SELECT id FROM auth.users WHERE email='EMEL_ANDA@gmail.com');

-- 4. JWT Expiry:
--    Dashboard > Authentication > Settings > JWT Expiry = 3600

-- 5. Enable Email confirmations:
--    Dashboard > Authentication > Email Templates > Confirm signup

-- ============================================================
-- END OF SNAPFLOW SECURE SCHEMA
-- ============================================================

-- ============================================================
-- TABLE: cart_items (Server-side cart — survive refresh)
-- ============================================================
CREATE TABLE IF NOT EXISTS cart_items (
    id          BIGSERIAL PRIMARY KEY,
    user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    product_id  BIGINT REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0 AND quantity <= 99),
    added_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Hanya pemilik boleh baca/ubah cart sendiri
CREATE POLICY "cart_items: owner only"
    ON cart_items FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_cart_items_user ON cart_items(user_id);

-- ============================================================
-- TABLE: order_items (Line items untuk setiap order)
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
    id          BIGSERIAL PRIMARY KEY,
    order_id    BIGINT REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    product_id  BIGINT REFERENCES products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    quantity    INTEGER NOT NULL CHECK (quantity > 0),
    unit_price  DECIMAL(10,2) NOT NULL,
    line_total  DECIMAL(10,2) NOT NULL
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_items: buyer can read own"
    ON order_items FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM orders WHERE id = order_items.order_id AND buyer_id = auth.uid())
    );

CREATE POLICY "order_items: system insert"
    ON order_items FOR INSERT WITH CHECK (TRUE);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- ============================================================
-- TABLE: subscriptions (Stripe subscriptions)
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
    user_id                 UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
    stripe_customer_id      TEXT UNIQUE,
    stripe_subscription_id  TEXT UNIQUE,
    stripe_session_id       TEXT,
    status                  TEXT DEFAULT 'inactive' CHECK (status IN ('inactive','active','cancelled','past_due')),
    plan                    TEXT DEFAULT 'free' CHECK (plan IN ('free','pro')),
    current_period_end      TIMESTAMPTZ,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions: owner can read own"
    ON subscriptions FOR SELECT USING (auth.uid() = user_id);

-- Hanya system (service role) boleh update
CREATE POLICY "subscriptions: system manage"
    ON subscriptions FOR ALL
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role='admin' OR is_admin=TRUE))
    );

-- Function: Kurang stok selepas order confirmed
CREATE OR REPLACE FUNCTION decrement_stock(p_product_id BIGINT, p_qty INTEGER)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE products
    SET stock = GREATEST(0, stock - p_qty)
    WHERE id = p_product_id;
END; $$;



-- ============================================================

-- ── ENABLE RLS UNTUK SEMUA TABLES ──────────────────────────
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS challenge_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS playlist_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS search_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS coins ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES COMPREHENSIVE — v4.0.0
-- SnapFlow Production-Ready Policies
-- ============================================================

-- ── PROFILES ────────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "profiles: public read"   ON profiles;
  DROP POLICY IF EXISTS "profiles: owner update"  ON profiles;
  DROP POLICY IF EXISTS "profiles: owner insert"  ON profiles;
  DROP POLICY IF EXISTS "profiles: sesiapa boleh baca"    ON profiles;
  DROP POLICY IF EXISTS "profiles: pemilik boleh update"  ON profiles;
  DROP POLICY IF EXISTS "profiles: pemilik boleh insert"  ON profiles;
EXCEPTION WHEN OTHERS THEN NULL; END; $$;

CREATE POLICY "profiles_select_all"  ON profiles FOR SELECT USING (TRUE);
CREATE POLICY "profiles_insert_own"  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own"  ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ── VIDEOS ──────────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "videos: sesiapa boleh baca yang published" ON videos;
  DROP POLICY IF EXISTS "videos: pemilik boleh tambah"  ON videos;
  DROP POLICY IF EXISTS "videos: pemilik boleh update"  ON videos;
  DROP POLICY IF EXISTS "videos: pemilik boleh padam"   ON videos;
  DROP POLICY IF EXISTS "videos_select" ON videos;
  DROP POLICY IF EXISTS "videos_insert" ON videos;
  DROP POLICY IF EXISTS "videos_update" ON videos;
  DROP POLICY IF EXISTS "videos_delete" ON videos;
EXCEPTION WHEN OTHERS THEN NULL; END; $$;

CREATE POLICY "videos_select" ON videos FOR SELECT
  USING (is_published = TRUE OR auth.uid() = user_id);
CREATE POLICY "videos_insert" ON videos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "videos_update" ON videos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "videos_delete" ON videos FOR DELETE USING (auth.uid() = user_id);

-- ── LIKES ───────────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "likes_select" ON likes;
  DROP POLICY IF EXISTS "likes_insert" ON likes;
  DROP POLICY IF EXISTS "likes_delete" ON likes;
EXCEPTION WHEN OTHERS THEN NULL; END; $$;

CREATE POLICY "likes_select" ON likes FOR SELECT USING (TRUE);
CREATE POLICY "likes_insert" ON likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes_delete" ON likes FOR DELETE USING (auth.uid() = user_id);

-- ── COMMENTS ────────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "comments_select" ON comments;
  DROP POLICY IF EXISTS "comments_insert" ON comments;
  DROP POLICY IF EXISTS "comments_update" ON comments;
  DROP POLICY IF EXISTS "comments_delete" ON comments;
EXCEPTION WHEN OTHERS THEN NULL; END; $$;

CREATE POLICY "comments_select" ON comments FOR SELECT USING (TRUE);
CREATE POLICY "comments_insert" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_update" ON comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "comments_delete" ON comments FOR DELETE USING (auth.uid() = user_id);

-- ── FOLLOWS ─────────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "follows_select" ON follows;
  DROP POLICY IF EXISTS "follows_insert" ON follows;
  DROP POLICY IF EXISTS "follows_delete" ON follows;
EXCEPTION WHEN OTHERS THEN NULL; END; $$;

CREATE POLICY "follows_select" ON follows FOR SELECT USING (TRUE);
CREATE POLICY "follows_insert" ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "follows_delete" ON follows FOR DELETE USING (auth.uid() = follower_id);

-- ── NOTIFICATIONS ────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "notifications_all" ON notifications;
EXCEPTION WHEN OTHERS THEN NULL; END; $$;

CREATE POLICY "notifications_all" ON notifications FOR ALL USING (auth.uid() = user_id);

-- ── MESSAGES ─────────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "messages_select" ON messages;
  DROP POLICY IF EXISTS "messages_insert" ON messages;
  DROP POLICY IF EXISTS "messages_delete" ON messages;
EXCEPTION WHEN OTHERS THEN NULL; END; $$;

CREATE POLICY "messages_select" ON messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "messages_insert" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "messages_delete" ON messages FOR DELETE USING (auth.uid() = sender_id);

-- ── PRODUCTS ─────────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "products_select" ON products;
  DROP POLICY IF EXISTS "products_insert" ON products;
  DROP POLICY IF EXISTS "products_update" ON products;
  DROP POLICY IF EXISTS "products_delete" ON products;
EXCEPTION WHEN OTHERS THEN NULL; END; $$;

-- Admin dan seller boleh urus; public boleh baca produk aktif
CREATE POLICY "products_select" ON products FOR SELECT
  USING (is_active = TRUE OR
    (auth.uid() IS NOT NULL AND (
      auth.uid() = seller_id OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (is_admin = TRUE OR role = 'admin'))
    ))
  );
CREATE POLICY "products_insert" ON products FOR INSERT
  WITH CHECK (
    auth.uid() = seller_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (is_admin = TRUE OR role = 'admin'))
  );
CREATE POLICY "products_update" ON products FOR UPDATE
  USING (
    auth.uid() = seller_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (is_admin = TRUE OR role = 'admin'))
  );
CREATE POLICY "products_delete" ON products FOR DELETE
  USING (
    auth.uid() = seller_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (is_admin = TRUE OR role = 'admin'))
  );

-- ── ORDERS ───────────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "orders_select" ON orders;
  DROP POLICY IF EXISTS "orders_insert" ON orders;
  DROP POLICY IF EXISTS "orders_update" ON orders;
EXCEPTION WHEN OTHERS THEN NULL; END; $$;

CREATE POLICY "orders_select" ON orders FOR SELECT
  USING (auth.uid() = buyer_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (is_admin = TRUE OR role = 'admin'))
  );
CREATE POLICY "orders_insert" ON orders FOR INSERT WITH CHECK (auth.uid() = buyer_id);
-- Webhook edge function akan update order (guna service_role, bypass RLS)

-- ── STORIES ──────────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "stories_select" ON stories;
  DROP POLICY IF EXISTS "stories_insert" ON stories;
  DROP POLICY IF EXISTS "stories_delete" ON stories;
EXCEPTION WHEN OTHERS THEN NULL; END; $$;

CREATE POLICY "stories_select" ON stories FOR SELECT
  USING (expires_at > NOW() OR auth.uid() = user_id);
CREATE POLICY "stories_insert" ON stories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "stories_delete" ON stories FOR DELETE USING (auth.uid() = user_id);

-- ── REACTIONS ────────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "reactions_select" ON reactions;
  DROP POLICY IF EXISTS "reactions_insert" ON reactions;
  DROP POLICY IF EXISTS "reactions_delete" ON reactions;
EXCEPTION WHEN OTHERS THEN NULL; END; $$;

CREATE POLICY "reactions_select" ON reactions FOR SELECT USING (TRUE);
CREATE POLICY "reactions_insert" ON reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reactions_delete" ON reactions FOR DELETE USING (auth.uid() = user_id);

-- ── CHALLENGES ───────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "challenges_select" ON challenges;
  DROP POLICY IF EXISTS "challenges_insert" ON challenges;
  DROP POLICY IF EXISTS "challenge_entries_select" ON challenge_entries;
  DROP POLICY IF EXISTS "challenge_entries_insert" ON challenge_entries;
EXCEPTION WHEN OTHERS THEN NULL; END; $$;

CREATE POLICY "challenges_select"       ON challenges       FOR SELECT USING (TRUE);
CREATE POLICY "challenges_insert"       ON challenges       FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "challenge_entries_select" ON challenge_entries FOR SELECT USING (TRUE);
CREATE POLICY "challenge_entries_insert" ON challenge_entries FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── LIVE SESSIONS ─────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "live_sessions_select" ON live_sessions;
  DROP POLICY IF EXISTS "live_sessions_insert" ON live_sessions;
  DROP POLICY IF EXISTS "live_sessions_update" ON live_sessions;
EXCEPTION WHEN OTHERS THEN NULL; END; $$;

CREATE POLICY "live_sessions_select" ON live_sessions FOR SELECT
  USING (is_active = TRUE OR auth.uid() = host_id);
CREATE POLICY "live_sessions_insert" ON live_sessions FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "live_sessions_update" ON live_sessions FOR UPDATE USING (auth.uid() = host_id);

-- ── GIFTS ────────────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "gifts_select" ON gifts;
  DROP POLICY IF EXISTS "gifts_insert" ON gifts;
EXCEPTION WHEN OTHERS THEN NULL; END; $$;

CREATE POLICY "gifts_select" ON gifts FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "gifts_insert" ON gifts FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- ── BLOCKED USERS ─────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "blocked_users_all" ON blocked_users;
EXCEPTION WHEN OTHERS THEN NULL; END; $$;

CREATE POLICY "blocked_users_all" ON blocked_users FOR ALL USING (auth.uid() = blocker_id);

-- ── PLAYLISTS ────────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "playlists_select" ON playlists;
  DROP POLICY IF EXISTS "playlists_all"    ON playlists;
EXCEPTION WHEN OTHERS THEN NULL; END; $$;

CREATE POLICY "playlists_select" ON playlists FOR SELECT
  USING (is_public = TRUE OR auth.uid() = user_id);
CREATE POLICY "playlists_modify" ON playlists FOR ALL USING (auth.uid() = user_id);

-- ── PLAYLIST VIDEOS ───────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "playlist_videos_select" ON playlist_videos;
  DROP POLICY IF EXISTS "playlist_videos_modify"  ON playlist_videos;
EXCEPTION WHEN OTHERS THEN NULL; END; $$;

CREATE POLICY "playlist_videos_select" ON playlist_videos FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM playlists WHERE id = playlist_videos.playlist_id
    AND (is_public = TRUE OR user_id = auth.uid())
  ));
CREATE POLICY "playlist_videos_modify" ON playlist_videos FOR ALL
  USING (EXISTS (
    SELECT 1 FROM playlists WHERE id = playlist_videos.playlist_id
    AND user_id = auth.uid()
  ));

-- ── CART ITEMS ───────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "cart_items_all"   ON cart_items;
  DROP POLICY IF EXISTS "cart_items_owner" ON cart_items;
EXCEPTION WHEN OTHERS THEN NULL; END; $$;

CREATE POLICY "cart_items_owner" ON cart_items FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── ORDER ITEMS ──────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "order_items_select" ON order_items;
  DROP POLICY IF EXISTS "order_items_insert" ON order_items;
EXCEPTION WHEN OTHERS THEN NULL; END; $$;

CREATE POLICY "order_items_select" ON order_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM orders WHERE id = order_items.order_id AND buyer_id = auth.uid()
  ));
-- Insert dilakukan oleh webhook (service_role — bypass RLS)

-- ── SUBSCRIPTIONS ────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "subscriptions_owner" ON subscriptions;
EXCEPTION WHEN OTHERS THEN NULL; END; $$;

CREATE POLICY "subscriptions_owner" ON subscriptions FOR SELECT USING (auth.uid() = user_id);

-- ── RATE LIMITS ──────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "rate_limits_owner" ON rate_limits;
EXCEPTION WHEN OTHERS THEN NULL; END; $$;

CREATE POLICY "rate_limits_owner" ON rate_limits FOR ALL USING (auth.uid() = user_id);

-- ── AUDIT LOGS ───────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "audit_logs_admin"  ON audit_logs;
  DROP POLICY IF EXISTS "audit_logs_insert" ON audit_logs;
EXCEPTION WHEN OTHERS THEN NULL; END; $$;

CREATE POLICY "audit_logs_admin_read" ON audit_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND (is_admin = TRUE OR role = 'admin')
  ));
-- Insert dari Edge Functions (service_role)

-- ── COINS ────────────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "coins_owner" ON coins;
EXCEPTION WHEN OTHERS THEN NULL; END; $$;

CREATE POLICY "coins_owner" ON coins FOR ALL USING (auth.uid() = user_id);

-- ── SEARCH QUERIES ───────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "search_queries_owner" ON search_queries;
EXCEPTION WHEN OTHERS THEN NULL; END; $$;

CREATE POLICY "search_queries_owner" ON search_queries FOR ALL USING (auth.uid() = user_id);

-- ── REPORTS ──────────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "reports_insert" ON reports;
  DROP POLICY IF EXISTS "reports_select" ON reports;
EXCEPTION WHEN OTHERS THEN NULL; END; $$;

CREATE POLICY "reports_insert" ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "reports_select" ON reports FOR SELECT
  USING (auth.uid() = reporter_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (is_admin = TRUE OR role = 'admin'))
  );

-- ============================================================
-- SEMAKAN AKHIR: Pastikan semua tables ada RLS ON
-- ============================================================
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    BEGIN
      EXECUTE 'ALTER TABLE ' || r.tablename || ' ENABLE ROW LEVEL SECURITY';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
  RAISE NOTICE 'RLS diaktifkan untuk semua tables';
END; $$;
