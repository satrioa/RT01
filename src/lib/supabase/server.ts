import { createClient } from "@supabase/supabase-js";

/**
 * Server Supabase client.
 * Uses service role or anon depending on context.
 * For RLS, prefer anon + auth header forwarding in Route Handlers.
 * This file is the canonical import for server-side Supabase access.
 */
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // DEV / server-side data fetching uses service_role to bypass RLS when
  // no authenticated user is present (DEV_RT_ID fallback). If service key
  // is not configured (e.g. preview), fall back to anon.
  const key = serviceKey ?? anonKey ?? "";

  if (!url || !key) {
    console.warn(
      "[supabase:server] Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return createClient(url ?? "", key);
}
