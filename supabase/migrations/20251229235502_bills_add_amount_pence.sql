-- Bills v0 patch: add missing columns safely

alter table public.bills
  add column if not exists amount_pence integer;

alter table public.bills
  add column if not exists currency text not null default 'GBP';

alter table public.bills
  add column if not exists is_recurring boolean not null default true;

alter table public.bills
  add column if not exists frequency text not null default 'monthly';

alter table public.bills
  add column if not exists next_due_date date;

alter table public.bills
  add column if not exists category text;

alter table public.bills
  add column if not exists provider text;

alter table public.bills
  add column if not exists notes text;
