-- Digital Letter — v1 schema
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query → paste → Run).
-- Idempotent: safe to re-run.

-- =============================================================
-- EXTENSIONS
-- =============================================================
create extension if not exists "uuid-ossp";

-- =============================================================
-- TABLES
-- =============================================================

-- LETTERS
-- A first letter has sender_id (logged-in user) set, guest_* null.
-- A reply has guest_sender_email set, sender_id null, in_reply_to → original.
create table if not exists public.letters (
  id uuid primary key default uuid_generate_v4(),

  -- Sender: either authenticated user (first letters) or guest (replies)
  sender_id uuid references auth.users(id) on delete set null,
  guest_sender_email text,
  guest_sender_name text,

  -- Recipient
  recipient_email text not null,
  recipient_name text,

  -- Content
  body_text text not null,
  audio_url text,

  -- Geography
  origin_lat double precision,
  origin_lng double precision,
  origin_label text,
  destination_lat double precision,
  destination_lng double precision,
  destination_label text,
  distance_km double precision,

  -- Timing
  dispatched_at timestamptz not null default now(),
  unlock_timestamp timestamptz not null,
  delivered_at timestamptz,
  opened_at timestamptz,

  -- Reply chain
  in_reply_to uuid references public.letters(id) on delete set null,

  -- Status: in_transit → delivered (email sent) → opened (recipient opened)
  status text not null default 'in_transit'
    check (status in ('in_transit', 'delivered', 'opened')),

  -- Public access token — recipients use this in URLs (no login needed)
  access_token uuid not null default uuid_generate_v4() unique,

  created_at timestamptz not null default now(),

  -- Exactly one sender form must be set
  constraint sender_required check (
    (sender_id is not null and guest_sender_email is null)
    or (sender_id is null and guest_sender_email is not null)
  )
);

create index if not exists idx_letters_recipient on public.letters(recipient_email);
create index if not exists idx_letters_sender on public.letters(sender_id);
create index if not exists idx_letters_unlock on public.letters(unlock_timestamp)
  where status = 'in_transit';
create index if not exists idx_letters_access_token on public.letters(access_token);

-- LETTER_IMAGES
create table if not exists public.letter_images (
  id uuid primary key default uuid_generate_v4(),
  letter_id uuid not null references public.letters(id) on delete cascade,
  image_url text not null,
  caption text,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_letter_images_letter on public.letter_images(letter_id);

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================
-- Sender access: protected by RLS using auth.uid().
-- Recipient access: NOT protected by RLS — handled by API routes
--   that use the service role + access_token lookup.
-- Guest reply inserts: also via API routes (service role).

alter table public.letters enable row level security;
alter table public.letter_images enable row level security;

-- Senders read their own letters
drop policy if exists "Senders see own letters" on public.letters;
create policy "Senders see own letters"
  on public.letters for select
  using (auth.uid() = sender_id);

-- Senders insert their own letters
drop policy if exists "Senders insert own letters" on public.letters;
create policy "Senders insert own letters"
  on public.letters for insert
  with check (auth.uid() = sender_id);

-- Senders see images of their own letters
drop policy if exists "Senders see own letter images" on public.letter_images;
create policy "Senders see own letter images"
  on public.letter_images for select
  using (
    exists (
      select 1 from public.letters
      where letters.id = letter_images.letter_id
        and letters.sender_id = auth.uid()
    )
  );

-- Senders insert images for their own letters
drop policy if exists "Senders insert own letter images" on public.letter_images;
create policy "Senders insert own letter images"
  on public.letter_images for insert
  with check (
    exists (
      select 1 from public.letters
      where letters.id = letter_images.letter_id
        and letters.sender_id = auth.uid()
    )
  );

-- =============================================================
-- STORAGE BUCKETS
-- =============================================================

insert into storage.buckets (id, name, public)
values ('letter-audio', 'letter-audio', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('letter-images', 'letter-images', false)
on conflict (id) do nothing;

-- Authenticated users upload to a folder named after their user id.
drop policy if exists "Users upload to own audio folder" on storage.objects;
create policy "Users upload to own audio folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'letter-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users upload to own image folder" on storage.objects;
create policy "Users upload to own image folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'letter-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users read own audio" on storage.objects;
create policy "Users read own audio"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'letter-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users read own images" on storage.objects;
create policy "Users read own images"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'letter-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Recipient access to audio/images is via signed URLs generated server-side
-- using the service role after unlock — no public bucket policy needed.
