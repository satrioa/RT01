-- =============================================================================
-- AI Provider Settings — per RT
-- Phase: Pengaturan AI
-- =============================================================================

create table if not exists public.rt_ai_settings (
  id uuid primary key default gen_random_uuid(),
  rt_id uuid not null unique references public.rt_profiles (id) on delete cascade,
  provider text not null default 'openrouter' check (provider in ('openrouter','openai','anthropic','mock')),
  model text not null default 'google/gemini-2.0-flash-001',
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rt_ai_settings_model_check check (char_length(model) between 1 and 100)
);

drop trigger if exists trg_rt_ai_settings_updated_at on public.rt_ai_settings;
create trigger trg_rt_ai_settings_updated_at
  before update on public.rt_ai_settings
  for each row execute function public.update_updated_at_column();

create index if not exists idx_rt_ai_settings_rt on public.rt_ai_settings (rt_id);

-- RLS: same as other rt tenant tables
alter table public.rt_ai_settings enable row level security;

drop policy if exists "rt_ai_settings_tenant" on public.rt_ai_settings;
create policy "rt_ai_settings_tenant"
  on public.rt_ai_settings for all to authenticated
  using (rt_id = public.auth_user_rt_id())
  with check (rt_id = public.auth_user_rt_id());

-- Allow service_role bypass (for bot/server). No anon policy.

-- Seed default for DEV RT
insert into public.rt_ai_settings (rt_id, provider, model)
values ('00000000-0000-4000-a000-000000000001', 'openrouter', 'inclusionai/ling-3.0-flash-fin:free')
on conflict (rt_id) do nothing;
