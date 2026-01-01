-- FS PATCH: Tasks v1 table (Phase 2) — idempotent even if tasks already exists
-- This migration may be applied to a project where `public.tasks` exists already (older shape).
-- We therefore:
-- 1) Create table if missing
-- 2) Add any missing columns
-- 3) Create indexes safely after columns exist
-- 4) Disable RLS (Phase 2 posture, matches Bills current approach)

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  family_id text not null,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add Phase 2 columns (safe if table exists with a subset of fields)
alter table public.tasks add column if not exists notes text null;
alter table public.tasks add column if not exists due_date date null;
alter table public.tasks add column if not exists assigned_to text null;
alter table public.tasks add column if not exists completed boolean not null default false;
alter table public.tasks add column if not exists calendar_sync_requested boolean not null default false;

create index if not exists tasks_family_id_idx on public.tasks (family_id);
create index if not exists tasks_family_due_idx on public.tasks (family_id, due_date);

-- Phase 2 posture: RLS disabled (admins/permissions later)
alter table public.tasks disable row level security;
