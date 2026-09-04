/**
 * Transaction repository — income/expense only.
 * Transfers have separate table/repository (see ../transfers).
 * All writes validated via Zod before persistence; DB constraints enforce invariants.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  transactionSchema,
  type TransactionInput,
} from "@/lib/validations/transaction";
import type { Transaction } from "@/types/database";

export interface ListTransactionsOptions {
  rtId: string;
  pocketId?: string;
  type?: "income" | "expense";
  limit?: number;
  offset?: number;
  fromDate?: string; // YYYY-MM-DD
  toDate?: string;
}

export async function listTransactions(
  supabase: SupabaseClient,
  opts: ListTransactionsOptions
): Promise<{ data: Transaction[] | null; error: unknown }> {
  let q = supabase
    .from("transactions")
    .select("*")
    .eq("rt_id", opts.rtId)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (opts.pocketId) q = q.eq("pocket_id", opts.pocketId);
  if (opts.type) q = q.eq("type", opts.type);
  if (opts.fromDate) q = q.gte("transaction_date", opts.fromDate);
  if (opts.toDate) q = q.lte("transaction_date", opts.toDate);
  if (opts.limit) q = q.limit(opts.limit);
  if (opts.offset) q = q.range(opts.offset, opts.offset + (opts.limit ?? 20) - 1);

  const { data, error } = await q;
  return { data: data as Transaction[] | null, error };
}

export async function getTransaction(
  supabase: SupabaseClient,
  id: string
): Promise<{ data: Transaction | null; error: unknown }> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", id)
    .single();
  return { data: data as Transaction | null, error };
}

export async function createTransaction(
  supabase: SupabaseClient,
  rtId: string,
  input: unknown
): Promise<{ data: Transaction | null; error: unknown }> {
  const parsed = transactionSchema.safeParse(input);
  if (!parsed.success) {
    return { data: null, error: parsed.error.flatten() };
  }

  // rt_id is set server-side from auth context; ignore client-provided
  const payload = {
    rt_id: rtId,
    pocket_id: parsed.data.pocket_id,
    category_id: parsed.data.category_id ?? null,
    type: parsed.data.type,
    amount: String(parsed.data.amount),
    description: parsed.data.description ?? null,
    transaction_date: parsed.data.transaction_date,
    source: parsed.data.source ?? "web",
  };

  const { data, error } = await supabase
    .from("transactions")
    .insert(payload)
    .select()
    .single();
  return { data: data as Transaction | null, error };
}

export async function updateTransaction(
  supabase: SupabaseClient,
  id: string,
  input: Partial<TransactionInput>
): Promise<{ data: Transaction | null; error: unknown }> {
  // Partial validation — amount still must be positive if provided
  const { data, error } = await supabase
    .from("transactions")
    .update({
      ...(input.pocket_id !== undefined ? { pocket_id: input.pocket_id } : {}),
      ...(input.category_id !== undefined ? { category_id: input.category_id } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.amount !== undefined ? { amount: String(input.amount) } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.transaction_date !== undefined
        ? { transaction_date: input.transaction_date }
        : {}),
      ...(input.source !== undefined ? { source: input.source } : {}),
    })
    .eq("id", id)
    .select()
    .single();
  return { data: data as Transaction | null, error };
}

export async function deleteTransaction(
  supabase: SupabaseClient,
  id: string
): Promise<{ error: unknown }> {
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  return { error };
}
