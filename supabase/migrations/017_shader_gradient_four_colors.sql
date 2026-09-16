-- =============================================================================
-- 017 — Shader gradient 4-color migration
-- Adds 4th color + motion controls to rt_appearance_settings and pockets,
-- recreates pocket_balances view to expose gradient_c4.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- rt_appearance_settings: gradient_color4 + speed/blur/intensity
-- ---------------------------------------------------------------------------
ALTER TABLE public.rt_appearance_settings
  ADD COLUMN IF NOT EXISTS gradient_color4 text NOT NULL DEFAULT '#D2D7EC',
  ADD COLUMN IF NOT EXISTS gradient_speed double precision NOT NULL DEFAULT 0.14,
  ADD COLUMN IF NOT EXISTS gradient_blur double precision NOT NULL DEFAULT 0.7,
  ADD COLUMN IF NOT EXISTS gradient_intensity double precision NOT NULL DEFAULT 0.95;

-- Hex check for gradient_color4
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rt_appearance_settings_gradient_color4_check') THEN
    ALTER TABLE public.rt_appearance_settings
      ADD CONSTRAINT rt_appearance_settings_gradient_color4_check
        CHECK (gradient_color4 IS NULL OR gradient_color4 ~ '^#[0-9a-fA-F]{6}$');
  END IF;
END $$;

-- Range checks for speed/blur/intensity (0..2 inclusive)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rt_appearance_settings_gradient_speed_check') THEN
    ALTER TABLE public.rt_appearance_settings
      ADD CONSTRAINT rt_appearance_settings_gradient_speed_check
        CHECK (gradient_speed BETWEEN 0 AND 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rt_appearance_settings_gradient_blur_check') THEN
    ALTER TABLE public.rt_appearance_settings
      ADD CONSTRAINT rt_appearance_settings_gradient_blur_check
        CHECK (gradient_blur BETWEEN 0 AND 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rt_appearance_settings_gradient_intensity_check') THEN
    ALTER TABLE public.rt_appearance_settings
      ADD CONSTRAINT rt_appearance_settings_gradient_intensity_check
        CHECK (gradient_intensity BETWEEN 0 AND 2);
  END IF;
END $$;

COMMENT ON COLUMN public.rt_appearance_settings.gradient_color4 IS 'Shader gradient 4th color (hex #RRGGBB), default #D2D7EC (Prism veil)';
COMMENT ON COLUMN public.rt_appearance_settings.gradient_speed IS 'Shader animation speed 0..2, default 0.14';
COMMENT ON COLUMN public.rt_appearance_settings.gradient_blur IS 'Shader blur 0..2, default 0.7';
COMMENT ON COLUMN public.rt_appearance_settings.gradient_intensity IS 'Shader intensity 0..2, default 0.95';

-- ---------------------------------------------------------------------------
-- pockets: gradient_c4
-- ---------------------------------------------------------------------------
ALTER TABLE public.pockets
  ADD COLUMN IF NOT EXISTS gradient_c4 text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pockets_gradient_c4_hex') THEN
    ALTER TABLE public.pockets
      ADD CONSTRAINT pockets_gradient_c4_hex
        CHECK (gradient_c4 IS NULL OR gradient_c4 ~ '^#[0-9a-fA-F]{6}$');
  END IF;
END $$;

COMMENT ON COLUMN public.pockets.gradient_c4 IS 'Pocket gradient 4th color (hex), nullable; used with shader 4-color presets';

-- ---------------------------------------------------------------------------
-- Recreate pocket_balances view to include gradient_c4
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.pocket_balances;

CREATE VIEW public.pocket_balances AS
SELECT
  p.id,
  p.rt_id,
  p.name,
  p.description,
  p.icon,
  p.color,
  p.gradient_c1,
  p.gradient_c3,
  p.gradient_c4,
  p.gradient_preset,
  p.opening_balance,
  p.is_active,
  p.sort_order,
  p.created_at,
  p.updated_at,
  coalesce(p.opening_balance, 0)
    + coalesce(inc.total_income, 0) - coalesce(exp.total_expense, 0)
    - coalesce(out_tr.total_out, 0) + coalesce(in_tr.total_in, 0) AS balance
FROM public.pockets p
LEFT JOIN (
  SELECT pocket_id, sum(amount) AS total_income
  FROM public.transactions WHERE type = 'income' GROUP BY pocket_id
) inc ON inc.pocket_id = p.id
LEFT JOIN (
  SELECT pocket_id, sum(amount) AS total_expense
  FROM public.transactions WHERE type = 'expense' GROUP BY pocket_id
) exp ON exp.pocket_id = p.id
LEFT JOIN (
  SELECT from_pocket_id AS pocket_id, sum(amount) AS total_out
  FROM public.transfers GROUP BY from_pocket_id
) out_tr ON out_tr.pocket_id = p.id
LEFT JOIN (
  SELECT to_pocket_id AS pocket_id, sum(amount) AS total_in
  FROM public.transfers GROUP BY to_pocket_id
) in_tr ON in_tr.pocket_id = p.id;

COMMENT ON VIEW public.pocket_balances IS 'Pocket balances with gradient columns — recreated in migration 017 to include gradient_c4.';
