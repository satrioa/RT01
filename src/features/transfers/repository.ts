/**
 * Transfer repository — pindah kantong.
 * Transfers MUST NOT be treated as income/expense; total RT balance unchanged.
 * DB enforces: amount > 0, from != to, same rt_id across pockets.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { transferSchema, type TransferInput } from "@/lib/validations/transfer";
import type { Transfer } from "@/types/database";

export async function listTransfers(
  supabase: SupabaseClient,
  rtId: string,
  opts?: { limit?: number; pocketId?: string }
): Promise<{ data: Transfer[] | null; error: unknown }> {
  let q = supabase
    .from("transfers")
    .select("*")
    .eq("rt_id", rtId)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (opts?.pocketId) {
    q = q.or(`from_pocket_id.eq.${opts.pocketId},to_pocket_id.eq.${opts.pocketId}`);
  }
  if (opts?.limit) q = q.limit(opts.limit);

  const { data, error } = await q;
  return { data: data as Transfer[] | null, error };
}

export async function getTransfer(
  supabase: SupabaseClient,
  id: string
): Promise<{ data: Transfer | null; error: unknown }> {
  const { data, error } = await supabase
    .from("transfers")
    .select("*")
    .eq("id", id)
    .single();
  return { data: data as Transfer | null, error };
}

export async function createTransfer(
  supabase: SupabaseClient,
  rtId: string,
  input: unknown
): Promise<{ data: Transfer | null; error: unknown }> {
  const parsed = transferSchema.safeParse(input);
  if (!parsed.success) {
    return { data: null, error: parsed.error.flatten() };
  }

  const payload = {
    rt_id: rtId,
    from_pocket_id: parsed.data.from_pocket_id,
    to_pocket_id: parsed.data.to_pocket_id,
    amount: String(parsed.data.amount),
    description: parsed.data.description ?? null,
    transaction_date: parsed.data.transaction_date,
  };

  const { data, error } = await supabase
    .from("transfers")
    .insert(payload)
    .select()
    .single();
  return { data: data as Transfer | null, error };
}

export async function deleteTransfer(
  supabase: SupabaseClient,
  id: string
): Promise<{ error: unknown }> {
  const { error } = await supabase.from("transfers").delete().eq("id", id);
  return { error };
}

// Re-export type for consumers
export type { TransferInput };
