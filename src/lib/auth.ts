import { createServerClient } from "@/lib/supabase/server";
import { DEV_RT_ID } from "@/lib/env";

/**
 * Resolve current RT id from authenticated session.
 * Phase 4: no real Supabase Auth wired yet — falls back to DEV_RT_ID.
 * Never trust client-supplied rt_id; always resolve server-side.
 */
export async function getCurrentRtId(): Promise<string> {
  // Attempt to read from Supabase Auth if configured
  try {
    const supabase = createServerClient();
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;
    if (userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("rt_id")
        .eq("id", userId)
        .maybeSingle();
      if (profile?.rt_id) return profile.rt_id as string;
    }
  } catch {
    // ignore — fallback
  }
  return DEV_RT_ID;
}

export function getDevRtId(): string {
  return DEV_RT_ID;
}
