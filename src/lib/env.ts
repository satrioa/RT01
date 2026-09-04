export function hasSupabaseEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/** Dev seed RT used when RLS/local dev without auth */
export const DEV_RT_ID = "00000000-0000-4000-a000-000000000001";
