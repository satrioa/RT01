-- =============================================================================
-- RT Finance — Initial Schema
-- Phase 1: Database & Domain Model
-- =============================================================================
-- Conventions:
--  - Money: NUMERIC(15,2) with CHECK > 0 (never float, never negative/zero)
--  - Balance is derived (views/functions), never stored mutable
--  - Transfers are separate ledger, not income/expense
--  - RLS: users access only their rt_id via profiles.rt_id
-- =============================================================================

-- Extensions
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Returns the rt_id of the current authenticated user (or null if anon)
create or replace function public.auth_user_rt_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select rt_id from public.profiles where id = auth.uid() limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('admin', 'bendahara', 'viewer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.category_type as enum ('income', 'expense', 'both');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.transaction_type as enum ('income', 'expense');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.transaction_source as enum ('web', 'telegram', 'whatsapp', 'import');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- rt_profiles
-- ---------------------------------------------------------------------------
create table if not exists public.rt_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rt_number text not null,
  rw_number text not null,
  address text,
  kelurahan text,
  kecamatan text,
  city text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rt_profiles_name_check check (char_length(name) between 1 and 100),
  constraint rt_profiles_rt_rw_check check (char_length(rt_number) between 1 and 10 and char_length(rw_number) between 1 and 10)
);
drop trigger if exists trg_rt_profiles_updated_at on public.rt_profiles;
create trigger trg_rt_profiles_updated_at
  before update on public.rt_profiles
  for each row execute function public.update_updated_at_column();
create index if not exists idx_rt_profiles_rt_rw on public.rt_profiles (rt_number, rw_number);

-- ---------------------------------------------------------------------------
-- profiles  (app users — linked to auth.users)
-- Supports: id, rt_id, name, role, created_at, updated_at
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  rt_id uuid not null references public.rt_profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  role public.user_role not null default 'viewer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at_column();
create index if not exists idx_profiles_rt_id on public.profiles (rt_id);
create index if not exists idx_profiles_role on public.profiles (role);

-- ---------------------------------------------------------------------------
-- pockets (kantong)
-- ---------------------------------------------------------------------------
create table if not exists public.pockets (
  id uuid primary key default gen_random_uuid(),
  rt_id uuid not null references public.rt_profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 50),
  description text check (char_length(description) <= 200),
  icon text check (char_length(icon) <= 50),
  color text check (char_length(color) <= 20),
  is_active boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pockets_name_rt_unique unique (rt_id, name)
);
drop trigger if exists trg_pockets_updated_at on public.pockets;
create trigger trg_pockets_updated_at
  before update on public.pockets
  for each row execute function public.update_updated_at_column();
create index if not exists idx_pockets_rt_id on public.pockets (rt_id);
create index if not exists idx_pockets_active on public.pockets (rt_id, is_active);

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  rt_id uuid not null references public.rt_profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 50),
  type public.category_type not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_name_rt_unique unique (rt_id, name)
);
drop trigger if exists trg_categories_updated_at on public.categories;
create trigger trg_categories_updated_at
  before update on public.categories
  for each row execute function public.update_updated_at_column();
create index if not exists idx_categories_rt_id on public.categories (rt_id);
create index if not exists idx_categories_type on public.categories (type);

-- ---------------------------------------------------------------------------
-- transactions  (income / expense only — transfers are separate table)
-- ---------------------------------------------------------------------------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  rt_id uuid not null references public.rt_profiles (id) on delete cascade,
  pocket_id uuid not null references public.pockets (id) on delete restrict,
  category_id uuid references public.categories (id) on delete set null,
  type public.transaction_type not null,
  amount numeric(15,2) not null check (amount > 0),
  description text check (char_length(description) <= 500),
  transaction_date date not null default current_date,
  source public.transaction_source not null default 'web',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_transactions_updated_at on public.transactions;
create trigger trg_transactions_updated_at
  before update on public.transactions
  for each row execute function public.update_updated_at_column();
create index if not exists idx_transactions_rt_id on public.transactions (rt_id);
create index if not exists idx_transactions_pocket on public.transactions (pocket_id);
create index if not exists idx_transactions_category on public.transactions (category_id);
create index if not exists idx_transactions_date on public.transactions (transaction_date desc);
create index if not exists idx_transactions_type on public.transactions (type);

-- Cross-RT + category-type guard for transactions
create or replace function public.validate_transaction_refs()
returns trigger
language plpgsql
as $$
declare
  pocket_rt uuid;
  cat_rt uuid;
  cat_type public.category_type;
begin
  select rt_id into pocket_rt from public.pockets where id = new.pocket_id;
  if pocket_rt is null then
    raise exception 'pocket_id does not exist';
  end if;
  if pocket_rt <> new.rt_id then
    raise exception 'cross-RT pocket reference denied (pocket.rt_id=% <> transaction.rt_id=%)', pocket_rt, new.rt_id;
  end if;

  if new.category_id is not null then
    select rt_id, type into cat_rt, cat_type from public.categories where id = new.category_id;
    if cat_rt is null then
      raise exception 'category_id does not exist';
    end if;
    if cat_rt <> new.rt_id then
      raise exception 'cross-RT category reference denied';
    end if;
    -- 'both' is compatible with income and expense
    if cat_type <> 'both' and cat_type::text <> new.type::text then
      raise exception 'category type % incompatible with transaction type %', cat_type, new.type;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_transaction_refs on public.transactions;
create trigger trg_validate_transaction_refs
  before insert or update on public.transactions
  for each row execute function public.validate_transaction_refs();

-- ---------------------------------------------------------------------------
-- transfers  (kantong → kantong, no income/expense semantics)
-- ---------------------------------------------------------------------------
create table if not exists public.transfers (
  id uuid primary key default gen_random_uuid(),
  rt_id uuid not null references public.rt_profiles (id) on delete cascade,
  from_pocket_id uuid not null references public.pockets (id) on delete restrict,
  to_pocket_id uuid not null references public.pockets (id) on delete restrict,
  amount numeric(15,2) not null check (amount > 0),
  description text check (char_length(description) <= 500),
  transaction_date date not null default current_date,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transfers_no_self check (from_pocket_id <> to_pocket_id)
);
drop trigger if exists trg_transfers_updated_at on public.transfers;
create trigger trg_transfers_updated_at
  before update on public.transfers
  for each row execute function public.update_updated_at_column();
create index if not exists idx_transfers_rt_id on public.transfers (rt_id);
create index if not exists idx_transfers_from on public.transfers (from_pocket_id);
create index if not exists idx_transfers_to on public.transfers (to_pocket_id);
create index if not exists idx_transfers_date on public.transfers (transaction_date desc);

-- Cross-RT guard for transfers (both pockets must belong to same rt as transfer.rt_id and each other)
create or replace function public.validate_transfer_refs()
returns trigger
language plpgsql
as $$
declare
  from_rt uuid;
  to_rt uuid;
begin
  select rt_id into from_rt from public.pockets where id = new.from_pocket_id;
  select rt_id into to_rt from public.pockets where id = new.to_pocket_id;
  if from_rt is null or to_rt is null then
    raise exception 'from_pocket or to_pocket does not exist';
  end if;
  if from_rt <> new.rt_id or to_rt <> new.rt_id then
    raise exception 'cross-RT transfer denied (from_rt=%, to_rt=%, transfer.rt_id=%)', from_rt, to_rt, new.rt_id;
  end if;
  if from_rt <> to_rt then
    raise exception 'cross-RT transfer denied: pockets belong to different RTs';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_transfer_refs on public.transfers;
create trigger trg_validate_transfer_refs
  before insert or update on public.transfers
  for each row execute function public.validate_transfer_refs();

-- ---------------------------------------------------------------------------
-- transaction_attachments
-- ---------------------------------------------------------------------------
create table if not exists public.transaction_attachments (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions (id) on delete cascade,
  file_url text not null check (char_length(file_url) between 1 and 2000),
  file_type text check (char_length(file_type) <= 100),
  created_at timestamptz not null default now()
);
create index if not exists idx_attachments_tx on public.transaction_attachments (transaction_id);

-- ---------------------------------------------------------------------------
-- Derived balances — never stored mutable
-- pocket_balances view + RPC functions
-- balance = SUM(income) - SUM(expense) - SUM(outgoing transfers) + SUM(incoming transfers)
-- ---------------------------------------------------------------------------
create or replace view public.pocket_balances as
select
  p.id,
  p.rt_id,
  p.name,
  p.description,
  p.icon,
  p.color,
  p.is_active,
  p.sort_order,
  p.created_at,
  p.updated_at,
  coalesce(inc.total_income, 0) - coalesce(exp.total_expense, 0)
    - coalesce(out_tr.total_out, 0) + coalesce(in_tr.total_in, 0) as balance
from public.pockets p
left join (
  select pocket_id, sum(amount) as total_income
  from public.transactions where type = 'income' group by pocket_id
) inc on inc.pocket_id = p.id
left join (
  select pocket_id, sum(amount) as total_expense
  from public.transactions where type = 'expense' group by pocket_id
) exp on exp.pocket_id = p.id
left join (
  select from_pocket_id as pocket_id, sum(amount) as total_out
  from public.transfers group by from_pocket_id
) out_tr on out_tr.pocket_id = p.id
left join (
  select to_pocket_id as pocket_id, sum(amount) as total_in
  from public.transfers group by to_pocket_id
) in_tr on in_tr.pocket_id = p.id;

-- Function: single pocket balance
create or replace function public.get_pocket_balance(p_pocket_id uuid)
returns numeric
language sql
stable
as $$
  select balance from public.pocket_balances where id = p_pocket_id;
$$;

-- Function: total RT balance (sum of all pocket balances; transfers net zero)
create or replace function public.get_rt_total_balance(p_rt_id uuid)
returns numeric
language sql
stable
as $$
  select coalesce(sum(
    coalesce(inc,0) - coalesce(exp,0)
  ),0)
  from (
    select
      (select coalesce(sum(amount),0) from public.transactions where rt_id = p_rt_id and type='income') as inc,
      (select coalesce(sum(amount),0) from public.transactions where rt_id = p_rt_id and type='expense') as exp
  ) s;
  -- transfers excluded by definition (same RT in/out nets zero)
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.rt_profiles enable row level security;
alter table public.profiles enable row level security;
alter table public.pockets enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.transfers enable row level security;
alter table public.transaction_attachments enable row level security;

-- helper: drop policies if exists (idempotent reruns)
do $$
declare r record;
begin
  for r in (
    select schemaname, tablename, policyname
    from pg_policies where schemaname='public'
  ) loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- rt_profiles: members can read their own RT, admins/bendahara can update
create policy "rt_profiles_select_own"
  on public.rt_profiles for select to authenticated
  using (id = public.auth_user_rt_id());

create policy "rt_profiles_update_own_admin"
  on public.rt_profiles for update to authenticated
  using (id = public.auth_user_rt_id() and exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','bendahara')
  ))
  with check (id = public.auth_user_rt_id());

-- profiles: read own RT, insert/update restricted
create policy "profiles_select_own_rt"
  on public.profiles for select to authenticated
  using (rt_id = public.auth_user_rt_id() or id = auth.uid());

create policy "profiles_insert_own_rt"
  on public.profiles for insert to authenticated
  with check (rt_id = public.auth_user_rt_id());

create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (id = auth.uid() or rt_id = public.auth_user_rt_id() and exists (
    select 1 from public.profiles me where me.id = auth.uid() and me.role = 'admin'
  ));

-- Generic helper pattern for tenant tables: rt_id = auth_user_rt_id()
create policy "pockets_tenant"
  on public.pockets for all to authenticated
  using (rt_id = public.auth_user_rt_id())
  with check (rt_id = public.auth_user_rt_id());

create policy "categories_tenant"
  on public.categories for all to authenticated
  using (rt_id = public.auth_user_rt_id())
  with check (rt_id = public.auth_user_rt_id());

create policy "transactions_tenant"
  on public.transactions for all to authenticated
  using (rt_id = public.auth_user_rt_id())
  with check (rt_id = public.auth_user_rt_id());

create policy "transfers_tenant"
  on public.transfers for all to authenticated
  using (rt_id = public.auth_user_rt_id())
  with check (rt_id = public.auth_user_rt_id());

-- Attachments: only if parent transaction belongs to user's RT
create policy "attachments_tenant_select"
  on public.transaction_attachments for select to authenticated
  using (exists (
    select 1 from public.transactions t
    where t.id = transaction_id and t.rt_id = public.auth_user_rt_id()
  ));

create policy "attachments_tenant_write"
  on public.transaction_attachments for all to authenticated
  using (exists (
    select 1 from public.transactions t
    where t.id = transaction_id and t.rt_id = public.auth_user_rt_id()
  ))
  with check (exists (
    select 1 from public.transactions t
    where t.id = transaction_id and t.rt_id = public.auth_user_rt_id()
  ));

-- Service role bypass: Supabase service_role bypasses RLS by default — no explicit policy needed.
-- Anon: no policies (deny).
