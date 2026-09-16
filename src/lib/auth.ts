import { createServerClient } from "@/lib/supabase/server";
import { DEV_RT_ID } from "@/lib/env";
import type { UserRole } from "@/types/database";

/**
 * Resolve current RT id from authenticated session.
 * Falls back to DEV_RT_ID when no Supabase Auth is configured.
 */
export async function getCurrentRtId(): Promise<string> {
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

/**
 * Resolve current user's role from authenticated session.
 * Returns null if not authenticated.
 */
export async function getCurrentUserRole(): Promise<UserRole | null> {
  try {
    const supabase = createServerClient();
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;
    if (!userId) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    return ((profile as { role?: UserRole } | null)?.role as UserRole) ?? null;
  } catch {
    return null;
  }
}

/**
 * Resolve RT id from the authenticated session (server-side).
 * Used by server components to get the admin's rt_id.
 */
export async function getAuthRtId(): Promise<string | null> {
  try {
    const supabase = createServerClient();
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;
    if (!userId) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("rt_id")
      .eq("id", userId)
      .maybeSingle();

    return (profile?.rt_id as string) ?? null;
  } catch {
    return null;
  }
}

/**
 * Resolve RT id for viewer from URL search params (?rt=xxx).
 * Falls back to DEV_RT_ID if not provided.
 */
export function getViewerRtId(searchParams?: Record<string, string | string[] | undefined>): string {
  if (!searchParams) return DEV_RT_ID;
  const rt = searchParams.rt;
  if (typeof rt === "string" && rt.length > 0) return rt;
  return DEV_RT_ID;
}

export function getDevRtId(): string {
  return DEV_RT_ID;
}

/**
 * Server-side login via Supabase Auth.
 */
export async function login(email: string, password: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

/**
 * Server-side logout.
 */
export async function logout() {
  const supabase = createServerClient();
  await supabase.auth.signOut();
}

/**
 * Enforce write access — throws or returns error if role is viewer.
 * Use at the top of server actions that mutate data.
 */
export async function requireWriteRole(): Promise<{ ok: false; error: string } | null> {
  const role = await getCurrentUserRole();
  if (role === "admin" || role === "bendahara") return null;
  return { ok: false, error: "Akses ditolak — hanya admin dan bendahara yang dapat mengubah data." };
}
