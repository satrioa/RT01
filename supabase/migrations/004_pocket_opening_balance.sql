-- =============================================================================
-- 004 — Pocket opening balance (saldo awal)
-- Adds initial balance per pocket; included in derived balances.
-- =============================================================================

-- Add column to pockets
alter table public.pockets
  add column if not exists opening_balance numeric(15,2) not null default 0
    check (opening_balance >= 0);

comment on column public.pockets.opening_balance is 'Saldo awal kantong saat dibuat — ikut hitung balance. Default 0.';

-- Recreate pocket_balances view to include opening_balance (drop first to allow column reorder)
drop view if exists public.pocket_balances;
create view public.pocket_balances as
select
  p.id,
  p.rt_id,
  p.name,
  p.description,
  p.icon,
  p.color,
  p.opening_balance,
  p.is_active,
  p.sort_order,
  p.created_at,
  p.updated_at,
  coalesce(p.opening_balance, 0)
    + coalesce(inc.total_income, 0) - coalesce(exp.total_expense, 0)
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

-- Update total RT balance to include opening balances
create or replace function public.get_rt_total_balance(p_rt_id uuid)
returns numeric
language sql
stable
as $$
  select coalesce(
    (select coalesce(sum(opening_balance),0) from public.pockets where rt_id = p_rt_id and is_active = true), 0
  ) + coalesce(sum(
    coalesce(inc,0) - coalesce(exp,0)
  ),0)
  from (
    select
      (select coalesce(sum(amount),0) from public.transactions where rt_id = p_rt_id and type='income') as inc,
      (select coalesce(sum(amount),0) from public.transactions where rt_id = p_rt_id and type='expense') as exp
  ) s;
$$;

-- get_pocket_balance already reads from view, no change needed (view now correct)
