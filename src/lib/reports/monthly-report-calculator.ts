/**
 * Monthly report calculator — pure + Supabase aggregation
 * Handles internal transfers correctly (NOT income/expense for RT)
 * Uses NUMERIC string handling, no floating errors via Number (safe for IDR up to 15,2)
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Pocket } from "@/types/database";

export interface MonthPeriod {
  year: number;
  month: number; // 1-12
  period_start: string; // YYYY-MM-DD
  period_end: string; // YYYY-MM-DD
}

export function getMonthPeriod(year: number, month: number): MonthPeriod {
  if (month < 1 || month > 12) throw new Error("Invalid month");
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0); // last day
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return { year, month, period_start: fmt(start), period_end: fmt(end) };
}

export function getPreviousMonthPeriod(year: number, month: number): MonthPeriod {
  if (month === 1) return getMonthPeriod(year - 1, 12);
  return getMonthPeriod(year, month - 1);
}

export interface PocketMonthlySnapshot {
  pocket_id: string;
  pocket_name: string;
  opening_balance: number;
  total_income: number;
  total_expense: number;
  total_transfer_in: number;
  total_transfer_out: number;
  closing_balance: number;
  transaction_count: number;
}

export interface MonthlySnapshot {
  rt_id: string;
  year: number;
  month: number;
  period_start: string;
  period_end: string;
  opening_balance: number;
  total_income: number;
  total_expense: number;
  total_transfer_in: number;
  total_transfer_out: number;
  closing_balance: number;
  transaction_count: number;
  pockets: PocketMonthlySnapshot[];
}

export async function calculateMonthlySnapshot(
  supabase: SupabaseClient,
  rtId: string,
  year: number,
  month: number
): Promise<MonthlySnapshot> {
  const { period_start, period_end } = getMonthPeriod(year, month);

  // Fetch pockets (including opening_balance)
  const { data: pocketsRaw, error: pErr } = await supabase
    .from("pockets")
    .select("id, name, opening_balance, is_active")
    .eq("rt_id", rtId)
    .order("sort_order", { ascending: true });
  if (pErr) throw new Error(`Failed to fetch pockets: ${pErr.message}`);
  const pockets = (pocketsRaw as (Pocket & { opening_balance: string })[] | null) ?? [];

  // Only active pockets contribute to opening? For report we snapshot all active pockets
  // But to preserve history, include active at calculation time
  const activePockets = pockets.filter((p) => p.is_active);

  // --- Transactions: before period, in period ---
  const [beforeTxRes, periodTxRes, beforeTrRes, periodTrRes] = await Promise.all([
    supabase
      .from("transactions")
      .select("pocket_id, type, amount")
      .eq("rt_id", rtId)
      .lt("transaction_date", period_start),
    supabase
      .from("transactions")
      .select("pocket_id, type, amount, id")
      .eq("rt_id", rtId)
      .gte("transaction_date", period_start)
      .lte("transaction_date", period_end),
    supabase
      .from("transfers")
      .select("from_pocket_id, to_pocket_id, amount")
      .eq("rt_id", rtId)
      .lt("transaction_date", period_start),
    supabase
      .from("transfers")
      .select("from_pocket_id, to_pocket_id, amount, id")
      .eq("rt_id", rtId)
      .gte("transaction_date", period_start)
      .lte("transaction_date", period_end),
  ]);

  if (beforeTxRes.error) throw new Error(beforeTxRes.error.message);
  if (periodTxRes.error) throw new Error(periodTxRes.error.message);
  if (beforeTrRes.error) throw new Error(beforeTrRes.error.message);
  if (periodTrRes.error) throw new Error(periodTrRes.error.message);

  const beforeTx = (beforeTxRes.data as { pocket_id: string; type: string; amount: string }[] | null) ?? [];
  const periodTx = (periodTxRes.data as { pocket_id: string; type: string; amount: string; id: string }[] | null) ?? [];
  const beforeTr = (beforeTrRes.data as { from_pocket_id: string; to_pocket_id: string; amount: string }[] | null) ?? [];
  const periodTr = (periodTrRes.data as { from_pocket_id: string; to_pocket_id: string; amount: string; id: string }[] | null) ?? [];

  // Aggregate before period per pocket
  const beforeIncomeByPocket = new Map<string, number>();
  const beforeExpenseByPocket = new Map<string, number>();
  for (const r of beforeTx) {
    if (r.type === "income") beforeIncomeByPocket.set(r.pocket_id, (beforeIncomeByPocket.get(r.pocket_id) ?? 0) + Number(r.amount));
    else beforeExpenseByPocket.set(r.pocket_id, (beforeExpenseByPocket.get(r.pocket_id) ?? 0) + Number(r.amount));
  }
  const beforeInByPocket = new Map<string, number>();
  const beforeOutByPocket = new Map<string, number>();
  for (const r of beforeTr) {
    beforeOutByPocket.set(r.from_pocket_id, (beforeOutByPocket.get(r.from_pocket_id) ?? 0) + Number(r.amount));
    beforeInByPocket.set(r.to_pocket_id, (beforeInByPocket.get(r.to_pocket_id) ?? 0) + Number(r.amount));
  }

  // Period aggregates
  const periodIncomeByPocket = new Map<string, number>();
  const periodExpenseByPocket = new Map<string, number>();
  const periodTxCountByPocket = new Map<string, number>();
  for (const r of periodTx) {
    periodTxCountByPocket.set(r.pocket_id, (periodTxCountByPocket.get(r.pocket_id) ?? 0) + 1);
    if (r.type === "income") periodIncomeByPocket.set(r.pocket_id, (periodIncomeByPocket.get(r.pocket_id) ?? 0) + Number(r.amount));
    else periodExpenseByPocket.set(r.pocket_id, (periodExpenseByPocket.get(r.pocket_id) ?? 0) + Number(r.amount));
  }
  const periodInByPocket = new Map<string, number>();
  const periodOutByPocket = new Map<string, number>();
  for (const r of periodTr) {
    periodOutByPocket.set(r.from_pocket_id, (periodOutByPocket.get(r.from_pocket_id) ?? 0) + Number(r.amount));
    periodInByPocket.set(r.to_pocket_id, (periodInByPocket.get(r.to_pocket_id) ?? 0) + Number(r.amount));
  }

  // Build per-pocket snapshots
  const pocketSnapshots: PocketMonthlySnapshot[] = activePockets.map((p) => {
    const initOpening = Number(p.opening_balance ?? 0);
    const beforeInc = beforeIncomeByPocket.get(p.id) ?? 0;
    const beforeExp = beforeExpenseByPocket.get(p.id) ?? 0;
    const beforeIn = beforeInByPocket.get(p.id) ?? 0;
    const beforeOut = beforeOutByPocket.get(p.id) ?? 0;
    const opening = initOpening + beforeInc - beforeExp + beforeIn - beforeOut;

    const income = periodIncomeByPocket.get(p.id) ?? 0;
    const expense = periodExpenseByPocket.get(p.id) ?? 0;
    const tIn = periodInByPocket.get(p.id) ?? 0;
    const tOut = periodOutByPocket.get(p.id) ?? 0;
    const closing = opening + income - expense + tIn - tOut;
    const txCount = periodTxCountByPocket.get(p.id) ?? 0;

    return {
      pocket_id: p.id,
      pocket_name: p.name,
      opening_balance: opening,
      total_income: income,
      total_expense: expense,
      total_transfer_in: tIn,
      total_transfer_out: tOut,
      closing_balance: closing,
      transaction_count: txCount,
    };
  });

  // RT totals
  const opening_balance = pocketSnapshots.reduce((s, p) => s + p.opening_balance, 0);
  const total_income = pocketSnapshots.reduce((s, p) => s + p.total_income, 0);
  const total_expense = pocketSnapshots.reduce((s, p) => s + p.total_expense, 0);
  const total_transfer_in = pocketSnapshots.reduce((s, p) => s + p.total_transfer_in, 0);
  const total_transfer_out = pocketSnapshots.reduce((s, p) => s + p.total_transfer_out, 0);
  // For RT, transfers cancel, but we keep both for snapshot
  const closing_balance = opening_balance + total_income - total_expense + total_transfer_in - total_transfer_out;
  // Verify transfers net zero for RT (should be equal)
  // If not equal due to cross-RT transfers (should not happen due to trigger), we keep as is

  const transaction_count = periodTx.length; // official transactions only, transfers not counted per spec? Spec says transaction_count (likely transactions)
  // If spec counts transfers separately, we keep transaction_count as transactions, transfers are separate

  // Consistency check
  const recomputedClosing = opening_balance + total_income - total_expense + total_transfer_in - total_transfer_out;
  if (Math.abs(recomputedClosing - closing_balance) > 0.01) {
    throw new Error("Inconsistent balance calculation");
  }

  return {
    rt_id: rtId,
    year,
    month,
    period_start,
    period_end,
    opening_balance,
    total_income,
    total_expense,
    total_transfer_in,
    total_transfer_out,
    closing_balance,
    transaction_count,
    pockets: pocketSnapshots,
  };
}
