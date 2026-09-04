/**
 * Balance calculation — pure domain logic + Supabase helpers.
 *
 * Financial rule (never stored mutable):
 *   pocket.balance =
 *     SUM(income over pocket_id)
 *   - SUM(expense over pocket_id)
 *   - SUM(outgoing transfers from_pocket_id)
 *   + SUM(incoming transfers to_pocket_id)
 *
 * Total RT balance = SUM(income) - SUM(expense) (transfers net zero).
 * Money is NUMERIC(15,2) on DB; in JS we keep string for precision
 * and expose helpers to parse/format.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type Money = string; // NUMERIC(15,2) serialized as string by Supabase

export function parseMoney(m: Money | number): number {
  return typeof m === "number" ? m : Number(m);
}

export function formatMoney(m: Money | number): string {
  const n = parseMoney(m);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * Pure calculation — useful for tests or client-side optimistic updates.
 * Inputs are already filtered to a single pocket or RT.
 */
export function calcPocketBalance(input: {
  income: Money[];
  expense: Money[];
  outgoing: Money[];
  incoming: Money[];
}): number {
  const sum = (arr: Money[]) =>
    arr.reduce((acc, v) => acc + parseMoney(v), 0);
  return sum(input.income) - sum(input.expense) - sum(input.outgoing) + sum(input.incoming);
}

export function calcRtTotalBalance(input: {
  income: Money[];
  expense: Money[];
}): number {
  const sum = (arr: Money[]) =>
    arr.reduce((acc, v) => acc + parseMoney(v), 0);
  return sum(input.income) - sum(input.expense);
}

// ---------------------------------------------------------------------------
// Supabase-backed helpers (server-side)
// Prefer pocket_balances view for reads; functions for single values.
// ---------------------------------------------------------------------------

export async function getPocketBalances(
  supabase: SupabaseClient,
  rtId: string
): Promise<
  { data: { id: string; name: string; balance: Money }[]; error: unknown }
> {
  const { data, error } = await supabase
    .from("pocket_balances")
    .select("id, name, balance")
    .eq("rt_id", rtId)
    .order("sort_order", { ascending: true });

  // Cast to expected shape; view returns NUMERIC as string
  return { data: (data as { id: string; name: string; balance: Money }[]) ?? [], error };
}

export async function getRtTotalBalance(
  supabase: SupabaseClient,
  rtId: string
): Promise<{ total: number; error: unknown }> {
  // Use RPC get_rt_total_balance if deployed, fallback to aggregation
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "get_rt_total_balance",
    { p_rt_id: rtId }
  );

  if (!rpcError && rpcData != null) {
    return { total: Number(rpcData), error: null };
  }

  // Fallback: aggregate directly (RLS still applies)
  const { data: inc, error: e1 } = await supabase
    .from("transactions")
    .select("amount")
    .eq("rt_id", rtId)
    .eq("type", "income");
  if (e1) return { total: 0, error: e1 };

  const { data: exp, error: e2 } = await supabase
    .from("transactions")
    .select("amount")
    .eq("rt_id", rtId)
    .eq("type", "expense");
  if (e2) return { total: 0, error: e2 };

  const income = (inc as { amount: Money }[] | null)?.map((r) => r.amount) ?? [];
  const expense = (exp as { amount: Money }[] | null)?.map((r) => r.amount) ?? [];
  return { total: calcRtTotalBalance({ income, expense }), error: null };
}
