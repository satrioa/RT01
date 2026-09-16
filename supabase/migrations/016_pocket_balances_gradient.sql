-- =============================================================================
-- 016 — Add gradient columns to pocket_balances view
-- Recreates the view from migration 004 to include gradient_c1, gradient_c3,
-- gradient_preset columns added in migrations 011 and 014.
-- =============================================================================

drop view if exists public.pocket_balances;

create view public.pocket_balances as
select
  p.id,
  p.rt_id,
  p.name,
  p.description,
  p.icon,
  p.color,
  p.gradient_c1,
  p.gradient_c3,
  p.gradient_preset,
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

comment on view public.pocket_balances is 'Pocket balances with gradient columns — recreated in migration 016 to include gradient_c1/c3/preset.';
