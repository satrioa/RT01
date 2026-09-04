-- =============================================================================
-- Telegram Integration — Linking + Pending Confirmations
-- Phase 7: Telegram Bot
-- =============================================================================

-- ---------------------------------------------------------------------------
-- telegram_link_codes — bendahara generates code in web app, user sends /link CODE in Telegram
-- ---------------------------------------------------------------------------
create table if not exists public.telegram_link_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (char_length(code) between 4 and 16),
  rt_id uuid not null references public.rt_profiles (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_telegram_link_codes_code on public.telegram_link_codes (code);
create index if not exists idx_telegram_link_codes_rt on public.telegram_link_codes (rt_id);
-- Cleanup expired codes periodically (optional)
create index if not exists idx_telegram_link_codes_expires on public.telegram_link_codes (expires_at) where used_at is null;

-- ---------------------------------------------------------------------------
-- telegram_accounts — verified link between Telegram user and RT profile
-- ---------------------------------------------------------------------------
create table if not exists public.telegram_accounts (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint not null unique,
  telegram_username text,
  chat_id bigint not null,
  rt_id uuid not null references public.rt_profiles (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  linked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_telegram_accounts_chat on public.telegram_accounts (chat_id);
create index if not exists idx_telegram_accounts_rt on public.telegram_accounts (rt_id);
create index if not exists idx_telegram_accounts_profile on public.telegram_accounts (profile_id);

drop trigger if exists trg_telegram_accounts_updated_at on public.telegram_accounts;
create trigger trg_telegram_accounts_updated_at
  before update on public.telegram_accounts
  for each row execute function public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- telegram_pending_confirmations — stores AI-parsed payload awaiting user confirmation (Simpan/Batal)
-- callback_data is limited to 64 bytes, so we store full payload in DB keyed by id.
-- ---------------------------------------------------------------------------
create table if not exists public.telegram_pending_confirmations (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint not null,
  chat_id bigint not null,
  rt_id uuid not null references public.rt_profiles (id) on delete cascade,
  intent_type text not null check (intent_type in ('create_transaction','create_transfer')),
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending','confirmed','cancelled','expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '10 minutes')
);
create index if not exists idx_telegram_pending_chat on public.telegram_pending_confirmations (chat_id);
create index if not exists idx_telegram_pending_status on public.telegram_pending_confirmations (status) where status = 'pending';
create index if not exists idx_telegram_pending_expires on public.telegram_pending_confirmations (expires_at);

-- ---------------------------------------------------------------------------
-- Helper: generate random 6-char alphanumeric code (called from app service, not DB)
-- ---------------------------------------------------------------------------
-- No DB function needed; app generates via crypto.

-- ---------------------------------------------------------------------------
-- RLS — restrict to service_role only (bot uses service_role). No authenticated policies.
-- ---------------------------------------------------------------------------
alter table public.telegram_link_codes enable row level security;
alter table public.telegram_accounts enable row level security;
alter table public.telegram_pending_confirmations enable row level security;

-- No policies => only service_role can access (bypass RLS). Web app uses service_role via server actions for linking.
-- Optionally allow authenticated to manage own codes/accounts:
do $$
begin
  if not exists (select 1 from pg_policies where policyname='telegram_link_codes_service' and tablename='telegram_link_codes') then
    create policy "telegram_link_codes_service" on public.telegram_link_codes for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname='telegram_accounts_service' and tablename='telegram_accounts') then
    create policy "telegram_accounts_service" on public.telegram_accounts for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname='telegram_pending_service' and tablename='telegram_pending_confirmations') then
    create policy "telegram_pending_service" on public.telegram_pending_confirmations for all to authenticated using (true) with check (true);
  end if;
end $$;

-- Allow anon/service to read for webhook (webhook uses service_role, but ensure)
-- Service role bypasses RLS regardless.
