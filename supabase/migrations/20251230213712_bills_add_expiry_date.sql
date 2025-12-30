-- Bills v0: add expiry_date (date)
-- nullable + safe
alter table public.bills
  add column if not exists expiry_date date;
