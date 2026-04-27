-- SubStop email import schema
-- Run this after the MVP subscriptions schema.

create extension if not exists pgcrypto;

create type public.import_provider as enum (
  'gmail'
);

create type public.import_connection_status as enum (
  'pending',
  'connected',
  'error',
  'revoked'
);

create type public.import_candidate_status as enum (
  'pending',
  'approved',
  'rejected'
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

create table if not exists public.import_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider public.import_provider not null,
  status public.import_connection_status not null default 'pending',
  connected_email text,
  external_account_id text,
  scopes text[] not null default array[]::text[],
  last_synced_at timestamptz,
  error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists import_connections_user_provider_email_idx
  on public.import_connections (user_id, provider, connected_email);

drop trigger if exists import_connections_set_updated_at on public.import_connections;

create trigger import_connections_set_updated_at
before update on public.import_connections
for each row
execute function public.set_updated_at();

create table if not exists public.import_candidates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  connection_id uuid references public.import_connections (id) on delete set null,
  source_message_id text not null,
  merchant_name text not null,
  normalized_name text,
  amount numeric(10, 2),
  currency_code text default 'USD' check (currency_code is null or char_length(currency_code) = 3),
  billing_cycle public.subscription_billing_cycle,
  renewal_date date,
  status public.import_candidate_status not null default 'pending',
  raw_subject text,
  raw_from text,
  raw_snippet text,
  detected_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists import_candidates_user_message_idx
  on public.import_candidates (user_id, source_message_id);

drop trigger if exists import_candidates_set_updated_at on public.import_candidates;

create trigger import_candidates_set_updated_at
before update on public.import_candidates
for each row
execute function public.set_updated_at();

alter table public.import_connections enable row level security;
alter table public.import_candidates enable row level security;

drop policy if exists "Users can view their own import connections" on public.import_connections;
create policy "Users can view their own import connections"
on public.import_connections
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own import connections" on public.import_connections;
create policy "Users can insert their own import connections"
on public.import_connections
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own import connections" on public.import_connections;
create policy "Users can update their own import connections"
on public.import_connections
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own import connections" on public.import_connections;
create policy "Users can delete their own import connections"
on public.import_connections
for delete
using (auth.uid() = user_id);

drop policy if exists "Users can view their own import candidates" on public.import_candidates;
create policy "Users can view their own import candidates"
on public.import_candidates
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own import candidates" on public.import_candidates;
create policy "Users can insert their own import candidates"
on public.import_candidates
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own import candidates" on public.import_candidates;
create policy "Users can update their own import candidates"
on public.import_candidates
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own import candidates" on public.import_candidates;
create policy "Users can delete their own import candidates"
on public.import_candidates
for delete
using (auth.uid() = user_id);
