import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client for server-side bot/webhook that bypasses RLS.
 * Falls back to anon if service key missing (dev).
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const key = serviceKey ?? anonKey ?? "";
  if (!url || !key) {
    console.warn("[supabase:service] Missing URL or key");
  }
  return createClient(url ?? "", key);
}
