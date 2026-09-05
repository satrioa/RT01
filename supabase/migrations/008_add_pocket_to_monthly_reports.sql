-- =============================================================================
-- 008 — Monthly Reports per-kantong (pocket_id) + Rekap RT (pocket_id IS NULL)
-- pocket_id NULL = Rekap gabungan; pocket_id NOT NULL = laporan 1 kantong
-- Dinamis: N kantong → N baris per bulan + 1 rekap
-- Kolom Kantong wajib di Rekap
-- =============================================================================

-- Add pocket_id (nullable for Rekap RT). Restrict delete to preserve history.
alter table public.monthly_reports
  add column if not exists pocket_id uuid references public.pockets(id) on delete restrict;

-- Indexes for per-pocket lookup
create index if not exists idx_monthly_reports_pocket on public.monthly_reports(pocket_id);
create index if not exists idx_monthly_reports_rt_pocket_period on public.monthly_reports(rt_id, pocket_id, year, month);
create index if not exists idx_monthly_reports_rt_pocket_year_month on public.monthly_reports(rt_id, pocket_id, year, month, version);

-- Replace unique: per-kantong per-versi. Use coalesce so NULL (Rekap) stays unique.
drop index if exists uq_monthly_reports_rt_year_month_version;
create unique index if not exists uq_monthly_reports_rt_pocket_year_month_version
  on public.monthly_reports (rt_id, coalesce(pocket_id,'00000000-0000-0000-0000-000000000000'::uuid), year, month, version);

-- Comment: monthly_report_pockets is now DEPRECATED; use monthly_reports.pocket_id
comment on table public.monthly_report_pockets is 'DEPRECATED: prefer monthly_reports.pocket_id. Kept for legacy rows (pocket_id IS NULL). Drop in 009 after stable.';
comment on column public.monthly_reports.pocket_id is 'NULL = Rekap RT gabungan (wajib kolom Kantong di PDF/Excel). NOT NULL = laporan 1 kantong (Kas/BOP/dinamis).';

-- Refresh RLS (policy already uses rt_id only, pocket_id inherits)
-- No new policy needed; existing monthly_reports_tenant covers pocket_id rows.

-- Helper view: rekap total per bulan (optional, for dashboard)
create or replace view public.v_monthly_reports_rekap as
select
  rt_id, year, month,
  count(*) filter (where pocket_id is not null) as pocket_count,
  sum(opening_balance) filter (where pocket_id is not null) as sum_opening,
  sum(total_income) filter (where pocket_id is not null) as sum_income,
  sum(total_expense) filter (where pocket_id is not null) as sum_expense,
  sum(closing_balance) filter (where pocket_id is not null) as sum_closing
from public.monthly_reports
where status = 'READY'
group by rt_id, year, month;
