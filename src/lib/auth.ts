import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { DEV_RT_ID } from "@/lib/env";
import type { UserRole } from "@/types/database";

/**
 * Helper: read auth user from cookies.
 * Supabase JS stores session as sb-<ref>-auth-token (base64-encoded JSON).
 * Handles chunked cookies (.0/.1), base64- prefix, and JSON parse.
 */
async function getUserFromCookies() {
  try {
    const cookieStore = await cookies();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return null;

    let ref: string | null = null;
    try {
      ref = new URL(url).hostname.split(".")[0] ?? null;
    } catch {
      ref = null;
    }

    const all = cookieStore.getAll();
    let raw: string | undefined;

    if (ref) {
      const primary = cookieStore.get(`sb-${ref}-auth-token`)?.value;
      if (primary) raw = primary;
    }

    if (!raw) {
      const found = all.find((c) => c.name.endsWith("-auth-token") && !c.name.match(/-auth-token\.\d+$/));
      if (found) raw = found.value;
    }

    // Handle chunked cookies: sb-<ref>-auth-token.0, .1, etc.
    const hasChunked = all.some((c) => /-auth-token\.\d+$/.test(c.name));
    if (hasChunked) {
      const chunks = all
        .filter((c) => /-auth-token\.\d+$/.test(c.name))
        // filter to current ref if known
        .filter((c) => (ref ? c.name.startsWith(`sb-${ref}-auth-token.`) : true))
        .sort((a, b) => {
          const na = parseInt(a.name.split(".").pop() || "0", 10);
          const nb = parseInt(b.name.split(".").pop() || "0", 10);
          return na - nb;
        });
      // If we already have raw but chunks exist, prefer assembled chunks when raw seems incomplete
      // Supabase chunks when cookie > 4KB; then primary cookie is split.
      if (chunks.length > 0) {
        // If raw was undefined or chunks exist, reassemble
        // Only reassemble if raw is chunk part or missing; if raw exists and is not chunked, keep raw
        // But when chunked, the base cookie often doesn't exist, so raw is undefined -> use chunks
        if (!raw || raw.length < chunks.map((c) => c.value).join("").length) {
          // If raw came from a non-chunked cookie but chunks also exist, chunks are more complete
          // Prefer chunks if they exist and ref matches
          const assembled = chunks.map((c) => c.value).join("");
          // Only override if assembled is non-empty
          if (assembled) raw = assembled;
        }
      }
    }

    if (!raw) return null;

    let tokenString = raw;
    if (tokenString.startsWith("base64-")) {
      tokenString = tokenString.slice("base64-".length);
      try {
        if (typeof Buffer !== "undefined") {
          tokenString = Buffer.from(tokenString, "base64").toString("utf-8");
        } else {
          tokenString = atob(tokenString);
        }
      } catch {
        // keep as is
      }
    }

    let accessToken: string | null = null;
    try {
      const parsed = JSON.parse(tokenString);
      if (parsed && typeof parsed === "object") {
        accessToken = (parsed as Record<string, string>).access_token ?? (parsed as Record<string, string>).accessToken ?? null;
        // sometimes directly a stringified token?
      }
    } catch {
      if (tokenString.startsWith("eyJ")) {
        accessToken = tokenString;
      }
    }
    if (!accessToken && tokenString.startsWith("eyJ")) accessToken = tokenString;
    if (!accessToken) return null;

    const anonClient = createClient(url, anonKey);
    const { data } = await anonClient.auth.getUser(accessToken);
    return data.user ?? null;
  } catch {
    return null;
  }
}

/**
 * Resolve current RT id from authenticated session.
 * Falls back to DEV_RT_ID when no Supabase Auth is configured.
 */
export async function getCurrentRtId(): Promise<string> {
  try {
    const user = await getUserFromCookies();
    const userId = user?.id;
    if (userId) {
      const service = createServiceClient();
      const { data: profile } = await service
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
    const user = await getUserFromCookies();
    const userId = user?.id;
    if (!userId) return null;

    const service = createServiceClient();
    const { data: profile } = await service
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
    const user = await getUserFromCookies();
    const userId = user?.id;
    if (!userId) return null;

    const service = createServiceClient();
    const { data: profile } = await service
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
