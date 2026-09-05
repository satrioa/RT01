ALTER TABLE public.rt_appearance_settings
  ADD COLUMN IF NOT EXISTS gradient_preset text NOT NULL DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS gradient_color1 text,
  ADD COLUMN IF NOT EXISTS gradient_color2 text,
  ADD COLUMN IF NOT EXISTS gradient_color3 text;

ALTER TABLE public.rt_appearance_settings
  DROP CONSTRAINT IF EXISTS rt_appearance_settings_gradient_preset_check,
  ADD CONSTRAINT rt_appearance_settings_gradient_preset_check
    CHECK (gradient_preset IN ('custom', 'Prism', 'Lava', 'Plasma', 'Pulse', 'Vortex', 'Mist')),
  DROP CONSTRAINT IF EXISTS rt_appearance_settings_gradient_color1_check,
  ADD CONSTRAINT rt_appearance_settings_gradient_color1_check
    CHECK (gradient_color1 IS NULL OR gradient_color1 ~ '^#[0-9a-fA-F]{6}$'),
  DROP CONSTRAINT IF EXISTS rt_appearance_settings_gradient_color2_check,
  ADD CONSTRAINT rt_appearance_settings_gradient_color2_check
    CHECK (gradient_color2 IS NULL OR gradient_color2 ~ '^#[0-9a-fA-F]{6}$'),
  DROP CONSTRAINT IF EXISTS rt_appearance_settings_gradient_color3_check,
  ADD CONSTRAINT rt_appearance_settings_gradient_color3_check
    CHECK (gradient_color3 IS NULL OR gradient_color3 ~ '^#[0-9a-fA-F]{6}$');
