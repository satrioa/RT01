-- =============================================================================
-- Seed — Development data (idempotent)
-- RT 01 seeded with deterministic UUIDs for stable local dev.
-- Apply AFTER 001_initial_schema.sql
-- =============================================================================

-- Fixed seed RT id so repos can reference it in dev without query
-- Use pgcrypto to keep uuid format stable across reruns via upsert on rt_number/rw_number
insert into public.rt_profiles (id, name, rt_number, rw_number, address, kelurahan, kecamatan, city)
values (
  '00000000-0000-4000-a000-000000000001',
  'RT 01',
  '01', '07',
  'Jl. Warga No. 1',
  'Kelurahan Contoh',
  'Kecamatan Contoh',
  'Kota Contoh'
)
on conflict (id) do update set
  name = excluded.name,
  updated_at = now();

-- Alternate upsert safety: if rt_profiles lacks unique on id (pk guarantees), this is idempotent.
-- We also ensure unique constraint on rt_id+name for pockets/categories prevents duplicates below.

-- Pockets for RT 01
insert into public.pockets (id, rt_id, name, description, icon, color, is_active, sort_order) values
  ('00000000-0000-4000-a000-000000000011', '00000000-0000-4000-a000-000000000001', 'Kas',      'Kas tunai RT',        'wallet',   '#111827', true, 1),
  ('00000000-0000-4000-a000-000000000012', '00000000-0000-4000-a000-000000000001', 'BOP',      'Biaya Operasional',   'building', '#374151', true, 2),
  ('00000000-0000-4000-a000-000000000013', '00000000-0000-4000-a000-000000000001', 'Sosial',   'Dana sosial warga',   'heart',    '#e11d48', true, 3),
  ('00000000-0000-4000-a000-000000000014', '00000000-0000-4000-a000-000000000001', 'Kegiatan', 'Dana kegiatan warga', 'calendar', '#0d9488', true, 4)
on conflict (rt_id, name) do nothing;

-- Categories — Income
insert into public.categories (id, rt_id, name, type, is_active) values
  ('00000000-0000-4000-a000-000000000021', '00000000-0000-4000-a000-000000000001', 'Iuran Warga', 'income', true),
  ('00000000-0000-4000-a000-000000000022', '00000000-0000-4000-a000-000000000001', 'Sumbangan',   'income', true),
  ('00000000-0000-4000-a000-000000000023', '00000000-0000-4000-a000-000000000001', 'Retribusi',   'income', true),
  ('00000000-0000-4000-a000-000000000024', '00000000-0000-4000-a000-000000000001', 'Lain-lain',   'both',   true)
on conflict (rt_id, name) do nothing;

-- Categories — Expense (keep same "Lain-lain" as type both covers both)
insert into public.categories (id, rt_id, name, type, is_active) values
  ('00000000-0000-4000-a000-000000000031', '00000000-0000-4000-a000-000000000001', 'Konsumsi',           'expense', true),
  ('00000000-0000-4000-a000-000000000032', '00000000-0000-4000-a000-000000000001', 'Kegiatan',           'expense', true),
  ('00000000-0000-4000-a000-000000000033', '00000000-0000-4000-a000-000000000001', 'Kebersihan',         'expense', true),
  ('00000000-0000-4000-a000-000000000034', '00000000-0000-4000-a000-000000000001', 'Keamanan',           'expense', true),
  ('00000000-0000-4000-a000-000000000035', '00000000-0000-4000-a000-000000000001', 'Administrasi',       'expense', true),
  ('00000000-0000-4000-a000-000000000036', '00000000-0000-4000-a000-000000000001', 'Sosial',             'expense', true),
  ('00000000-0000-4000-a000-000000000037', '00000000-0000-4000-a000-000000000001', 'Sarana & Prasarana', 'expense', true)
on conflict (rt_id, name) do nothing;

-- Note: "Lain-lain" (000...024) is type both, shared.

-- Optional: single demo expense/income (commented — uncomment to verify balance view works)
-- insert into public.transactions (rt_id, pocket_id, category_id, type, amount, description, transaction_date, source)
-- values
--   ('00000000-0000-4000-a000-000000000001','00000000-0000-4000-a000-000000000011','00000000-0000-4000-a000-000000000021','income',  1000000, 'Iuran warga Jan 2026', '2026-01-05', 'web'),
--   ('00000000-0000-4000-a000-000000000001','00000000-0000-4000-a000-000000000011','00000000-0000-4000-a000-000000000031','expense',  75000,  'Konsumsi kerja bakti',  '2026-01-06', 'web')
-- on conflict do nothing;
