-- Pocket animated gradient preset per kantong
ALTER TABLE public.pockets
  ADD COLUMN IF NOT EXISTS gradient_preset text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pockets_gradient_preset_check') THEN
    ALTER TABLE public.pockets
      ADD CONSTRAINT pockets_gradient_preset_check
      CHECK (gradient_preset IS NULL OR gradient_preset IN ('custom', 'Prism', 'Lava', 'Plasma', 'Pulse', 'Vortex', 'Mist'));
  END IF;
END $$;

COMMENT ON COLUMN public.pockets.gradient_preset IS 'Animated gradient preset id per pocket (null/custom = triplet warna, Prism..Mist = preset animasi)';
