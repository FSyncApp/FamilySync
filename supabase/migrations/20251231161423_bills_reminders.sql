-- FS PATCH: Bills reminders columns
-- Adds simple reminder preferences per bill.
-- Safe defaults for existing rows.

alter table public.bills
  add column if not exists reminder_enabled boolean not null default false;

alter table public.bills
  add column if not exists reminder_days_before integer not null default 7;
