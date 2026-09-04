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

  if (!url || !anonKey) {
    console.warn(
      "[supabase:server] Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return createClient(url ?? "", anonKey ?? "");
}
