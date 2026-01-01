-- FS PATCH: Tasks v1.1 — reminders fields (Phase 2 intent only)
-- Stores reminder preference for future notifications (no notification logic in Phase 2).

alter table public.tasks add column if not exists reminder_enabled boolean not null default false;
alter table public.tasks add column if not exists reminder_days_before integer null;

-- Phase 2 posture: keep RLS disabled (admins/permissions later)
alter table public.tasks disable row level security;
