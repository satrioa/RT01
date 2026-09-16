-- =============================================================================
-- RT Finance — Viewer Read Policies
-- Phase: Role-Based Access
-- =============================================================================
-- Adds SELECT-only policies for anonymous/unauthenticated access.
-- This allows viewers (warga) to read data without logging in.
-- Write operations remain restricted to authenticated admin/bendahara users.
-- =============================================================================

-- Drop existing permissive read policies if they exist (idempotent)
DO $$
DECLARE r record;
BEGIN
  FOR r IN (
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('rt_profiles', 'pockets', 'categories', 'transactions', 'transfers', 'monthly_reports', 'monthly_report_pockets', 'transaction_attachments')
      AND (policyname LIKE '%anon%' OR policyname LIKE '%public%')
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- Allow anonymous SELECT on rt_profiles (needed for header/greeting)
DROP POLICY IF EXISTS "rt_profiles_anon_select" ON public.rt_profiles;
CREATE POLICY "rt_profiles_anon_select"
  ON public.rt_profiles FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous SELECT on pockets (viewer needs to see pocket list)
DROP POLICY IF EXISTS "pockets_anon_select" ON public.pockets;
CREATE POLICY "pockets_anon_select"
  ON public.pockets FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous SELECT on categories (viewer needs to see categories in lists)
DROP POLICY IF EXISTS "categories_anon_select" ON public.categories;
CREATE POLICY "categories_anon_select"
  ON public.categories FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous SELECT on transactions (viewer needs to see transaction list)
DROP POLICY IF EXISTS "transactions_anon_select" ON public.transactions;
CREATE POLICY "transactions_anon_select"
  ON public.transactions FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous SELECT on transfers (viewer needs to see transfers)
DROP POLICY IF EXISTS "transfers_anon_select" ON public.transfers;
CREATE POLICY "transfers_anon_select"
  ON public.transfers FOR SELECT
  TO anon
  USING (true);

-- pocket_balances is a VIEW — no RLS policy needed.
-- anon access to balances is granted via underlying tables (pockets, transactions, transfers).
-- Ensure view is security_invoker = true so it respects caller's RLS (pg 15+ default is security_invoker false).
-- Recreate view with security_invoker if needed (no-op if already correct).

-- Allow anonymous SELECT on monthly_reports (viewer needs to see reports)
DROP POLICY IF EXISTS "monthly_reports_anon_select" ON public.monthly_reports;
CREATE POLICY "monthly_reports_anon_select"
  ON public.monthly_reports FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous SELECT on monthly_report_pockets (viewer needs pocket breakdowns)
DROP POLICY IF EXISTS "monthly_report_pockets_anon_select" ON public.monthly_report_pockets;
CREATE POLICY "monthly_report_pockets_anon_select"
  ON public.monthly_report_pockets FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous SELECT on transaction_attachments (viewer may need to see files)
DROP POLICY IF EXISTS "transaction_attachments_anon_select" ON public.transaction_attachments;
CREATE POLICY "transaction_attachments_anon_select"
  ON public.transaction_attachments FOR SELECT
  TO anon
  USING (true);

-- Views need explicit GRANT for anon (RLS not applicable to views)
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.pocket_balances TO anon;
GRANT SELECT ON public.v_monthly_reports_rekap TO anon;
