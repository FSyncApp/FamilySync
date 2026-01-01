-- FS PATCH: Allow tasks.user_id NULL for dev (Phase 2 without auth)
ALTER TABLE public.tasks
  ALTER COLUMN user_id DROP NOT NULL;
