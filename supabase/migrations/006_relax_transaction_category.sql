-- =============================================================================
-- 006 — Relax transaction category type check (personal app)
-- Personal app: allow any category for any transaction type
-- Keep cross-RT guards, drop strict 'both' vs income/expense check
-- =============================================================================

create or replace function public.validate_transaction_refs()
returns trigger
language plpgsql
as $$
declare
  pocket_rt uuid;
  cat_rt uuid;
begin
  select rt_id into pocket_rt from public.pockets where id = new.pocket_id;
  if pocket_rt is null then
    raise exception 'pocket_id does not exist';
  end if;
  if pocket_rt <> new.rt_id then
    raise exception 'cross-RT pocket reference denied (pocket.rt_id=% <> transaction.rt_id=%)', pocket_rt, new.rt_id;
  end if;

  if new.category_id is not null then
    select rt_id into cat_rt from public.categories where id = new.category_id;
    if cat_rt is null then
      raise exception 'category_id does not exist';
    end if;
    if cat_rt <> new.rt_id then
      raise exception 'cross-RT category reference denied';
    end if;
    -- category type check removed for personal app: any category allowed for any type
  end if;

  return new;
end;
$$;

-- trigger already exists, function replacement is sufficient
comment on function public.validate_transaction_refs() is 'Relaxed 2026-09: category type check removed for personal app';
