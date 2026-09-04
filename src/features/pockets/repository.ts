/**
 * Pocket repository — server-side Supabase access, RLS-aware.
 * All functions require an authenticated SupabaseClient with user session.
 * Validation via Zod schemas before DB writes.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { pocketSchema } from "@/lib/validations/pocket";
import type { Pocket, PocketBalance } from "@/types/database";

export async function listPockets(
  supabase: SupabaseClient,
  rtId: string
): Promise<{ data: Pocket[] | null; error: unknown }> {
  const { data, error } = await supabase
    .from("pockets")
    .select("*")
    .eq("rt_id", rtId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  return { data: data as Pocket[] | null, error };
}

export async function listActivePockets(
  supabase: SupabaseClient,
  rtId: string
): Promise<{ data: Pocket[] | null; error: unknown }> {
  const { data, error } = await supabase
    .from("pockets")
    .select("*")
    .eq("rt_id", rtId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  return { data: data as Pocket[] | null, error };
}

export async function getPocket(
  supabase: SupabaseClient,
  pocketId: string
): Promise<{ data: Pocket | null; error: unknown }> {
  const { data, error } = await supabase
    .from("pockets")
    .select("*")
    .eq("id", pocketId)
    .single();
  return { data: data as Pocket | null, error };
}

/** Reads from pocket_balances view (derived, not mutable). */
export async function listPocketsWithBalance(
  supabase: SupabaseClient,
  rtId: string
): Promise<{ data: PocketBalance[] | null; error: unknown }> {
  const { data, error } = await supabase
    .from("pocket_balances")
    .select("*")
    .eq("rt_id", rtId)
    .order("sort_order", { ascending: true });
  return { data: data as PocketBalance[] | null, error };
}

export async function createPocket(
  supabase: SupabaseClient,
  rtId: string,
  input: unknown
): Promise<{ data: Pocket | null; error: unknown }> {
  const parsed = pocketSchema.safeParse(input);
  if (!parsed.success) {
    return { data: null, error: parsed.error.flatten() };
  }
  const { data, error } = await supabase
    .from("pockets")
    .insert({ rt_id: rtId, ...parsed.data })
    .select()
    .single();
  return { data: data as Pocket | null, error };
}

export async function updatePocket(
  supabase: SupabaseClient,
  pocketId: string,
  input: unknown
): Promise<{ data: Pocket | null; error: unknown }> {
  const parsed = pocketSchema.partial().safeParse(input);
  if (!parsed.success) {
    return { data: null, error: parsed.error.flatten() };
  }
  const { data, error } = await supabase
    .from("pockets")
    .update(parsed.data)
    .eq("id", pocketId)
    .select()
    .single();
  return { data: data as Pocket | null, error };
}

export async function archivePocket(
  supabase: SupabaseClient,
  pocketId: string
): Promise<{ data: Pocket | null; error: unknown }> {
  const { data, error } = await supabase
    .from("pockets")
    .update({ is_active: false })
    .eq("id", pocketId)
    .select()
    .single();
  return { data: data as Pocket | null, error };
}
