"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentRtId } from "@/lib/auth";

export interface StorageStats {
  transactions: number;
  transfers: number;
  monthly_reports: number;
  attachments: number;
  pockets: number;
  categories: number;
}

export async function getStorageStatsAction(): Promise<StorageStats> {
  const rtId = await getCurrentRtId();
  const supabase = createServiceClient();
  const zero: StorageStats = { transactions: 0, transfers: 0, monthly_reports: 0, attachments: 0, pockets: 0, categories: 0 };
  try {
    const [tx, tr, rep, pok, cat, txIds] = await Promise.all([
      supabase.from("transactions").select("id", { count: "exact", head: true }).eq("rt_id", rtId),
      supabase.from("transfers").select("id", { count: "exact", head: true }).eq("rt_id", rtId),
      supabase.from("monthly_reports").select("id", { count: "exact", head: true }).eq("rt_id", rtId),
      supabase.from("pockets").select("id", { count: "exact", head: true }).eq("rt_id", rtId),
      supabase.from("categories").select("id", { count: "exact", head: true }).eq("rt_id", rtId),
      supabase.from("transactions").select("id").eq("rt_id", rtId).limit(5000),
    ]);
    // attachments have no rt_id — count via RT transaction ids
    let attachments = 0;
    try {
      const ids = (((txIds as unknown as { data: { id: string }[] | null }).data) ?? []).map((r) => r.id);
      for (let i = 0; i < ids.length; i += 500) {
        const { count } = await supabase
          .from("transaction_attachments")
          .select("id", { count: "exact", head: true })
          .in("transaction_id", ids.slice(i, i + 500));
        attachments += count ?? 0;
      }
    } catch {
      // table may not exist — ignore
    }
    return {
      transactions: tx.count ?? 0,
      transfers: tr.count ?? 0,
      monthly_reports: rep.count ?? 0,
      attachments,
      pockets: pok.count ?? 0,
      categories: cat.count ?? 0,
    };
  } catch {
    return zero;
  }
}

const EXPORT_LIMIT = 10000;

export interface BackupPayload {
  version: 1;
  exported_at: string;
  rt_id: string;
  rt_profile: unknown;
  pockets: unknown[];
  categories: unknown[];
  transactions: unknown[];
  transfers: unknown[];
  monthly_reports: unknown[];
  monthly_report_pockets: unknown[];
  truncated: Record<string, boolean>;
}

export async function exportBackupAction(): Promise<{ ok: boolean; backup?: BackupPayload; error?: string }> {
  const rtId = await getCurrentRtId();
  const supabase = createServiceClient();
  try {
    const [rt, pockets, categories, txs, trs, reports] = await Promise.all([
      supabase.from("rt_profiles").select("*").eq("id", rtId).maybeSingle(),
      supabase.from("pockets").select("*").eq("rt_id", rtId).order("sort_order").limit(EXPORT_LIMIT),
      supabase.from("categories").select("*").eq("rt_id", rtId).order("name").limit(EXPORT_LIMIT),
      supabase.from("transactions").select("*").eq("rt_id", rtId).order("transaction_date").limit(EXPORT_LIMIT),
      supabase.from("transfers").select("*").eq("rt_id", rtId).order("transaction_date").limit(EXPORT_LIMIT),
      supabase.from("monthly_reports").select("*").eq("rt_id", rtId).order("year").order("month").limit(EXPORT_LIMIT),
    ]);
    const firstErr = [rt, pockets, categories, txs, trs, reports].find((r) => r.error);
    if (firstErr?.error) return { ok: false, error: firstErr.error.message };

    const reportIds = ((reports.data as { id: string }[] | null) ?? []).map((r) => r.id);
    let reportPockets: unknown[] = [];
    if (reportIds.length > 0) {
      const { data, error } = await supabase
        .from("monthly_report_pockets")
        .select("*")
        .in("monthly_report_id", reportIds)
        .limit(EXPORT_LIMIT);
      if (error) return { ok: false, error: error.message };
      reportPockets = data ?? [];
    }

    const len = (d: unknown) => (Array.isArray(d) ? d.length : 0);
    return {
      ok: true,
      backup: {
        version: 1,
        exported_at: new Date().toISOString(),
        rt_id: rtId,
        rt_profile: rt.data ?? null,
        pockets: (pockets.data as unknown[] | null) ?? [],
        categories: (categories.data as unknown[] | null) ?? [],
        transactions: (txs.data as unknown[] | null) ?? [],
        transfers: (trs.data as unknown[] | null) ?? [],
        monthly_reports: (reports.data as unknown[] | null) ?? [],
        monthly_report_pockets: reportPockets,
        truncated: {
          transactions: len(txs.data) >= EXPORT_LIMIT,
          transfers: len(trs.data) >= EXPORT_LIMIT,
        },
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal export backup" };
  }
}

export interface ResetResult {
  ok: boolean;
  deleted?: { attachments: number; report_pockets: number; reports: number; transfers: number; transactions: number };
  storage_removed?: number;
  error?: string;
}

async function deleteAll(
  supabase: ReturnType<typeof createServiceClient>,
  table: string,
  rtId: string,
  dateCol = "created_at"
): Promise<number> {
  let total = 0;
  // PostgREST blocks unfiltered deletes — loop pages with tautology filter
  for (let i = 0; i < 50; i++) {
    const { data, error } = await supabase
      .from(table)
      .delete()
      .eq("rt_id", rtId)
      .gte(dateCol, "1970-01-01T00:00:00.000Z")
      .select("id")
      .limit(1000);
    if (error) throw new Error(`${table}: ${error.message}`);
    const n = (data as unknown[] | null)?.length ?? 0;
    total += n;
    if (n < 1000) break;
  }
  return total;
}

async function removeStorageFolder(
  supabase: ReturnType<typeof createServiceClient>,
  rtId: string
): Promise<number> {
  try {
    let removed = 0;
    const walk = async (prefix: string): Promise<void> => {
      const { data, error } = await supabase.storage.from("monthly-reports").list(prefix, { limit: 100 });
      if (error || !data) return;
      for (const entry of data as { id: string | null; name: string }[]) {
        const full = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (!entry.id) {
          await walk(full);
        } else {
          const { error: rmErr } = await supabase.storage.from("monthly-reports").remove([full]);
          if (!rmErr) removed++;
        }
      }
    };
    await walk(rtId);
    return removed;
  } catch {
    return 0;
  }
}

export async function resetRtDataAction(confirmation: string): Promise<ResetResult> {
  if (confirmation !== "RESET") {
    return { ok: false, error: 'Ketik "RESET" untuk konfirmasi.' };
  }
  const rtId = await getCurrentRtId();
  const supabase = createServiceClient();
  try {
    // child tables first (FK safety)
    // transaction_attachments has no rt_id — count via RT transactions, deleted by ON DELETE CASCADE
    let attachments = 0;
    try {
      const { data: txIds } = await supabase.from("transactions").select("id").eq("rt_id", rtId).limit(5000);
      const ids = ((txIds as { id: string }[] | null) ?? []).map((r) => r.id);
      for (let i = 0; i < ids.length; i += 500) {
        const { count } = await supabase
          .from("transaction_attachments")
          .select("id", { count: "exact", head: true })
          .in("transaction_id", ids.slice(i, i + 500));
        attachments += count ?? 0;
      }
    } catch {
      // table may not exist — ignore
    }
    // monthly_report_pockets has no rt_id — delete via parent report ids
    let rp = 0;
    try {
      const { data: reps } = await supabase.from("monthly_reports").select("id").eq("rt_id", rtId).limit(5000);
      const ids = ((reps as { id: string }[] | null) ?? []).map((r) => r.id);
      for (let i = 0; i < ids.length; i += 500) {
        const chunk = ids.slice(i, i + 500);
        const { error, count } = await supabase.from("monthly_report_pockets").delete({ count: "exact" }).in("monthly_report_id", chunk);
        if (error) throw new Error(error.message);
        rp += count ?? 0;
      }
    } catch {
      // table may not exist — ignore
    }
    const reports = await deleteAll(supabase, "monthly_reports", rtId);
    const transfers = await deleteAll(supabase, "transfers", rtId);
    const transactions = await deleteAll(supabase, "transactions", rtId);
    const storage_removed = await removeStorageFolder(supabase, rtId);

    revalidatePath("/");
    revalidatePath("/transactions");
    revalidatePath("/reports");
    revalidatePath("/pengaturan");

    return { ok: true, deleted: { attachments, report_pockets: rp, reports, transfers, transactions }, storage_removed };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal reset data" };
  }
}
