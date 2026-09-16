import { createClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client.
 * Requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 * Safe to import in client components — anon key is public.
 */
export function createBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    // Return a dummy that will throw on use — prevents build-time crash
    // before env is configured. Validated at runtime in components.
    console.warn(
      "[supabase] Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return createClient(url ?? "", anonKey ?? "");
}

/**
 * Sync Supabase session to document.cookie so server can read auth via cookies().
 * Supabase JS default storage is localStorage; server needs cookie mirror.
 * Name: sb-<REF>-auth-token with base64- prefix (Supabase convention).
 */
export function syncAuthToCookies(
  session: { access_token: string; refresh_token?: string; [k: string]: unknown } | null | undefined
) {
  if (typeof document === "undefined") return;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return;
  let ref: string | null = null;
  try {
    ref = new URL(url).hostname.split(".")[0] ?? null;
  } catch {
    ref = null;
  }
  if (!ref) return;
  if (!session) {
    clearAuthCookies();
    return;
  }
  try {
    const json = JSON.stringify(session);
    let base64: string;
    if (typeof Buffer !== "undefined" && typeof Buffer.from === "function") {
      base64 = Buffer.from(json, "utf-8").toString("base64");
    } else {
      base64 = btoa(json);
    }
    const value = `base64-${base64}`;
    // 7 days, Lax, path=/
    document.cookie = `sb-${ref}-auth-token=${value}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
  } catch {
    // ignore
  }
}

export function clearAuthCookies() {
  if (typeof document === "undefined") return;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let ref: string | null = null;
  try {
    if (url) ref = new URL(url).hostname.split(".")[0] ?? null;
  } catch {
    ref = null;
  }
  const expire = "max-age=0; path=/; SameSite=Lax";
  if (ref) {
    document.cookie = `sb-${ref}-auth-token=; ${expire}`;
    document.cookie = `sb-${ref}-auth-token.0=; ${expire}`;
    document.cookie = `sb-${ref}-auth-token.1=; ${expire}`;
  } else {
    const all = document.cookie.split(";").map((c) => c.trim().split("=")[0]);
    for (const name of all) {
      if (name.endsWith("-auth-token") || name.includes("-auth-token.")) {
        document.cookie = `${name}=; ${expire}`;
      }
    }
  }
}
