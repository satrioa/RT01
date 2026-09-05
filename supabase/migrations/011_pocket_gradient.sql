-- Pocket gradient — 2 kolom nullable (c1 terang, c3 gelap; c2 = color)
ALTER TABLE pockets ADD COLUMN IF NOT EXISTS gradient_c1 text;
ALTER TABLE pockets ADD COLUMN IF NOT EXISTS gradient_c3 text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pockets_gradient_c1_hex') THEN
    ALTER TABLE pockets ADD CONSTRAINT pockets_gradient_c1_hex CHECK (gradient_c1 IS NULL OR gradient_c1 ~ '^#[0-9a-fA-F]{6}$');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pockets_gradient_c3_hex') THEN
    ALTER TABLE pockets ADD CONSTRAINT pockets_gradient_c3_hex CHECK (gradient_c3 IS NULL OR gradient_c3 ~ '^#[0-9a-fA-F]{6}$');
  END IF;
END $$;

-- Backfill seed 4 kantong → preset (copy c2→color)
UPDATE pockets SET color='#FB7185', gradient_c1='#FDE68A', gradient_c3='#7C3AED'
  WHERE rt_id='00000000-0000-4000-a000-000000000001' AND name='Kas' AND (gradient_c1 IS NULL OR gradient_c3 IS NULL);
UPDATE pockets SET color='#2563EB', gradient_c1='#0EA5E9', gradient_c3='#172554'
  WHERE rt_id='00000000-0000-4000-a000-000000000001' AND name='BOP' AND (gradient_c1 IS NULL OR gradient_c3 IS NULL);
UPDATE pockets SET color='#F472B6', gradient_c1='#FCE7F3', gradient_c3='#9D174D'
  WHERE rt_id='00000000-0000-4000-a000-000000000001' AND name='Sosial' AND (gradient_c1 IS NULL OR gradient_c3 IS NULL);
UPDATE pockets SET color='#22C55E', gradient_c1='#BBF7D0', gradient_c3='#14532D'
  WHERE rt_id='00000000-0000-4000-a000-000000000001' AND name='Kegiatan' AND (gradient_c1 IS NULL OR gradient_c3 IS NULL);
