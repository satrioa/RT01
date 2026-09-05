-- Appearance per RT — Semua default Sunset, hero + detail ikut preset
CREATE TABLE IF NOT EXISTS rt_appearance_settings (
  rt_id uuid PRIMARY KEY REFERENCES rt_profiles(id) ON DELETE CASCADE,
  style text NOT NULL DEFAULT 'sunset' CHECK (style IN ('auto','biru_rt','pastel','blue_ocean','red_bloom','purple_dream','sunset','forest','mint','peach','lavender','rose','sky','aurora','cyber','midnight','obsidian','coffee','candy','lime','coral','ice')),
  saturation numeric NOT NULL DEFAULT 1.1 CHECK (saturation BETWEEN 0.5 AND 2.0),
  contrast numeric NOT NULL DEFAULT 1.6 CHECK (contrast BETWEEN 0.8 AND 2.5),
  animation_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_rt_appearance_updated_at ON rt_appearance_settings;
CREATE TRIGGER trg_rt_appearance_updated_at
  BEFORE UPDATE ON rt_appearance_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE rt_appearance_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rt_appearance_tenant" ON rt_appearance_settings;
CREATE POLICY "rt_appearance_tenant"
  ON rt_appearance_settings FOR ALL TO authenticated
  USING (rt_id = auth_user_rt_id())
  WITH CHECK (rt_id = auth_user_rt_id());

INSERT INTO rt_appearance_settings (rt_id, style, saturation, contrast, animation_enabled)
  VALUES ('00000000-0000-4000-a000-000000000001', 'sunset', 1.1, 1.6, true)
  ON CONFLICT (rt_id) DO NOTHING;
