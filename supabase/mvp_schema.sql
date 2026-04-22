-- SubStop MVP schema
-- Core goal: store each user's subscriptions, renewal dates, and reminder preferences.

create extension if not exists pgcrypto;

create type public.subscription_billing_cycle as enum (
  'weekly',
  'monthly',
  'quarterly',
  'yearly',
  'custom'
);

create type public.subscription_status as enum (
  'active',
  'canceling',
  'canceled'
);

create type public.subscription_category as enum (
  'streaming',
  'music',
  'productivity',
  'shopping',
  'gaming',
  'fitness',
  'cloud',
  'ai',
  'finance',
  'utilities',
  'other'
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.reminder_days_are_valid(days integer[])
returns boolean
language sql
immutable
as $$
  select coalesce(bool_and(day_value between 1 and 30), true)
  from unnest(days) as day_value;
$$;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  provider text,
  amount numeric(10, 2) not null check (amount >= 0),
  currency_code text not null default 'USD' check (char_length(currency_code) = 3),
  billing_cycle public.subscription_billing_cycle not null default 'monthly',
  renewal_date date not null,
  reminder_days integer[] not null default array[7, 3, 1],
  status public.subscription_status not null default 'active',
  category public.subscription_category not null default 'other',
  notes text,
  cancellation_url text,
  is_trial boolean not null default false,
  trial_ends_at date,
  canceled_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint reminder_days_positive check (
    public.reminder_days_are_valid(reminder_days)
  ),
  constraint trial_end_matches_trial_flag check (
    (is_trial = false and trial_ends_at is null)
    or (is_trial = true)
  )
);

create index if not exists subscriptions_user_id_idx
  on public.subscriptions (user_id);

create index if not exists subscriptions_user_status_idx
  on public.subscriptions (user_id, status);

create index if not exists subscriptions_user_renewal_date_idx
  on public.subscriptions (user_id, renewal_date);

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;

create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row
execute function public.set_updated_at();

alter table public.subscriptions enable row level security;

drop policy if exists "Users can view their own subscriptions" on public.subscriptions;
create policy "Users can view their own subscriptions"
on public.subscriptions
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own subscriptions" on public.subscriptions;
create policy "Users can insert their own subscriptions"
on public.subscriptions
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own subscriptions" on public.subscriptions;
create policy "Users can update their own subscriptions"
on public.subscriptions
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own subscriptions" on public.subscriptions;
create policy "Users can delete their own subscriptions"
on public.subscriptions
for delete
using (auth.uid() = user_id);
