-- Phase 2 Bills v0: app has no auth yet, so RLS blocks anon inserts.
-- Disable RLS temporarily; tighten later when family/user scoping is introduced.

alter table public.bills disable row level security;
