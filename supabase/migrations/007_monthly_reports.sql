-- =============================================================================
-- 007 — Monthly Reports (official financial document / snapshot)
-- Monthly only: YYYY-MM-01 → last day of month, no custom ranges
-- Snapshot preserves historical balances, transfers are internal
-- =============================================================================

-- ---------------------------------------------------------------------------
-- monthly_reports
-- ---------------------------------------------------------------------------
create table if not exists public.monthly_reports (
  id uuid primary key default gen_random_uuid(),
  rt_id uuid not null references public.rt_profiles (id) on delete cascade,
  year int not null check (year between 2000 and 2100),
  month int not null check (month between 1 and 12),
  period_start date not null,
  period_end date not null,
  status text not null default 'READY' check (status in ('OPEN','GENERATING','READY','CLOSED','REOPENED','FAILED')),
  opening_balance numeric(15,2) not null default 0 check (opening_balance >= 0),
  total_income numeric(15,2) not null default 0 check (total_income >= 0),
  total_expense numeric(15,2) not null default 0 check (total_expense >= 0),
  total_transfer_in numeric(15,2) not null default 0 check (total_transfer_in >= 0),
  total_transfer_out numeric(15,2) not null default 0 check (total_transfer_out >= 0),
  closing_balance numeric(15,2) not null default 0 check (closing_balance >= 0),
  transaction_count int not null default 0 check (transaction_count >= 0),
  pdf_url text check (char_length(pdf_url) <= 2000),
  excel_url text check (char_length(excel_url) <= 2000),
  generated_at timestamptz,
  generated_by uuid references public.profiles (id) on delete set null,
  version int not null default 1 check (version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint monthly_reports_period_check check (period_start = make_date(year, month, 1) and period_end = (make_date(year, month, 1) + interval '1 month' - interval '1 day')::date),
  constraint monthly_reports_balance_check check (
    closing_balance = opening_balance + total_income - total_expense + total_transfer_in - total_transfer_out
    or status in ('OPEN','GENERATING','FAILED')
  )
);

-- History via version. One row per version.
create unique index if not exists uq_monthly_reports_rt_year_month_version on public.monthly_reports (rt_id, year, month, version);
-- For cron idempotency and latest lookup
create index if not exists idx_monthly_reports_rt_period on public.monthly_reports (rt_id, year, month);
create index if not exists idx_monthly_reports_rt_year_month_status on public.monthly_reports (rt_id, year, month, status);
create index if not exists idx_monthly_reports_status on public.monthly_reports (status);

drop trigger if exists trg_monthly_reports_updated_at on public.monthly_reports;
create trigger trg_monthly_reports_updated_at
  before update on public.monthly_reports
  for each row execute function public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- monthly_report_pockets (per-kantong snapshot)
-- ---------------------------------------------------------------------------
create table if not exists public.monthly_report_pockets (
  id uuid primary key default gen_random_uuid(),
  monthly_report_id uuid not null references public.monthly_reports (id) on delete cascade,
  pocket_id uuid not null references public.pockets (id) on delete restrict,
  pocket_name text not null,
  opening_balance numeric(15,2) not null default 0 check (opening_balance >= 0),
  total_income numeric(15,2) not null default 0 check (total_income >= 0),
  total_expense numeric(15,2) not null default 0 check (total_expense >= 0),
  total_transfer_in numeric(15,2) not null default 0 check (total_transfer_in >= 0),
  total_transfer_out numeric(15,2) not null default 0 check (total_transfer_out >= 0),
  closing_balance numeric(15,2) not null default 0 check (closing_balance >= 0),
  transaction_count int not null default 0 check (transaction_count >= 0),
  created_at timestamptz not null default now(),
  constraint mrp_balance_check check (closing_balance = opening_balance + total_income - total_expense + total_transfer_in - total_transfer_out)
);

create unique index if not exists uq_mrp_report_pocket on public.monthly_report_pockets (monthly_report_id, pocket_id);
create index if not exists idx_mrp_report on public.monthly_report_pockets (monthly_report_id);
create index if not exists idx_mrp_pocket on public.monthly_report_pockets (pocket_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.monthly_reports enable row level security;
alter table public.monthly_report_pockets enable row level security;

do $$
declare r record;
begin
  for r in (
    select schemaname, tablename, policyname
    from pg_policies where schemaname='public' and tablename in ('monthly_reports','monthly_report_pockets')
  ) loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- Tenant isolation: rt_id = auth_user_rt_id()
create policy "monthly_reports_tenant"
  on public.monthly_reports for all to authenticated
  using (rt_id = public.auth_user_rt_id())
  with check (rt_id = public.auth_user_rt_id());

-- Pocket snapshots: via parent report's rt_id
create policy "mrp_tenant_select"
  on public.monthly_report_pockets for select to authenticated
  using (exists (select 1 from public.monthly_reports mr where mr.id = monthly_report_id and mr.rt_id = public.auth_user_rt_id()));

create policy "mrp_tenant_write"
  on public.monthly_report_pockets for all to authenticated
  using (exists (select 1 from public.monthly_reports mr where mr.id = monthly_report_id and mr.rt_id = public.auth_user_rt_id()))
  with check (exists (select 1 from public.monthly_reports mr where mr.id = monthly_report_id and mr.rt_id = public.auth_user_rt_id()));

-- Service role bypass implied (no explicit policy needed)

-- ---------------------------------------------------------------------------
-- Helper: last day of month
-- ---------------------------------------------------------------------------
create or replace function public.month_last_day(y int, m int)
returns date
language sql
immutable
as $$ select (make_date(y, m, 1) + interval '1 month' - interval '1 day')::date $$;
