import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";
import { calculateMonthlySnapshot, calculatePocketMonthlySnapshot, getMonthPeriod } from "./monthly-report-calculator";
import { generateMonthlyPdf } from "./pdf-generator";
import { generateMonthlyExcel } from "./excel-generator";
import { uploadReportFile, getReportFileUrl } from "./storage";

export type MonthlyReportStatus = "OPEN" | "GENERATING" | "READY" | "CLOSED" | "REOPENED" | "FAILED";

export interface MonthlyReportRow {
  id: string;
  rt_id: string;
  pocket_id: string | null; // null = Rekap RT gabungan
  year: number;
  month: number;
  period_start: string;
  period_end: string;
  status: MonthlyReportStatus;
  opening_balance: string;
  total_income: string;
  total_expense: string;
  total_transfer_in: string;
  total_transfer_out: string;
  closing_balance: string;
  transaction_count: number;
  pdf_url: string | null;
  excel_url: string | null;
  generated_at: string | null;
  generated_by: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

function isMissingTableError(error: unknown): boolean {
  const msg = (error as { message?: string })?.message ?? String(error);
  const code = (error as { code?: string })?.code;
  return code === "42P01" || msg.includes("Could not find the table") || msg.includes("schema cache") || msg.includes("does not exist");
}

function isMissingColumnError(error: unknown): boolean {
  const msg = (error as { message?: string })?.message ?? String(error);
  return msg.includes("pocket_id") && (msg.includes("does not exist") || msg.includes("column") || msg.includes("schema cache"));
}

function normalizePocketId(pocketId?: string | null): string | null {
  if (!pocketId || pocketId === "rekap" || pocketId === "null") return null;
  return pocketId;
}

export async function getMonthlyReport(
  supabase: SupabaseClient,
  rtId: string,
  year: number,
  month: number,
  pocketId?: string | null
): Promise<MonthlyReportRow | null> {
  const pid = normalizePocketId(pocketId);
  let q = supabase.from("monthly_reports").select("*").eq("rt_id", rtId).eq("year", year).eq("month", month);
  // pocket filter — if column missing, fallback without filter
  if (pid === null) {
    // Rekap: pocket_id IS NULL. Try is(), fallback to eq if is() fails due to missing column handled below.
    q = q.is("pocket_id", null) as unknown as typeof q;
  } else {
    q = q.eq("pocket_id", pid) as unknown as typeof q;
  }
  const { data, error } = await q.order("version", { ascending: false }).limit(1).maybeSingle();
  if (error) {
    if (isMissingTableError(error)) {
      console.warn("[monthly_reports] table missing — run migration 007/008. Returning null.");
      return null;
    }
    if (isMissingColumnError(error)) {
      // column not yet migrated — fallback to old query without pocket_id (treat as rekap)
      console.warn("[monthly_reports] pocket_id column missing — fallback to legacy query");
      const { data: legacy, error: e2 } = await supabase.from("monthly_reports").select("*").eq("rt_id", rtId).eq("year", year).eq("month", month).order("version", { ascending: false }).limit(1).maybeSingle();
      if (e2) {
        if (isMissingTableError(e2)) return null;
        throw new Error(e2.message);
      }
      return (legacy as MonthlyReportRow | null) ?? null;
    }
    throw new Error(error.message);
  }
  return (data as MonthlyReportRow | null) ?? null;
}

export async function listMonthlyReports(
  supabase: SupabaseClient,
  rtId: string,
  opts: { pocketId?: string | null; limit?: number } | number = {}
): Promise<MonthlyReportRow[]> {
  let pocketId: string | null | undefined;
  let limit = 12;
  if (typeof opts === "number") {
    limit = opts;
  } else {
    pocketId = opts.pocketId;
    if (opts.limit) limit = opts.limit;
  }
  // If pocketId === undefined => return all (for admin/rekap view). If null => only rekap. If string => only that pocket.
  const pid = pocketId === undefined ? undefined : normalizePocketId(pocketId);
  let q = supabase.from("monthly_reports").select("*").eq("rt_id", rtId);
  if (pid !== undefined) {
    if (pid === null) q = q.is("pocket_id", null) as unknown as typeof q;
    else q = q.eq("pocket_id", pid) as unknown as typeof q;
  }
  const { data, error } = await q.order("year", { ascending: false }).order("month", { ascending: false }).order("version", { ascending: false }).limit(limit * 4); // overfetch for dedup
  if (error) {
    if (isMissingTableError(error)) {
      console.warn("[monthly_reports] table missing — run migration 007/008. Returning []");
      return [];
    }
    if (isMissingColumnError(error)) {
      console.warn("[monthly_reports] pocket_id column missing — fallback legacy list");
      const { data: legacy, error: e2 } = await supabase.from("monthly_reports").select("*").eq("rt_id", rtId).order("year", { ascending: false }).order("month", { ascending: false }).order("version", { ascending: false }).limit(limit);
      if (e2) {
        if (isMissingTableError(e2)) return [];
        throw new Error(e2.message);
      }
      const map2 = new Map<string, MonthlyReportRow>();
      for (const r of (legacy as MonthlyReportRow[] | null) ?? []) {
        const key = `${r.year}-${r.month}`;
        if (!map2.has(key)) map2.set(key, r);
      }
      return Array.from(map2.values()).slice(0, limit);
    }
    throw new Error(error.message);
  }
  // Deduplicate to latest version per (year, month, pocket_id)
  const map = new Map<string, MonthlyReportRow>();
  for (const r of (data as MonthlyReportRow[] | null) ?? []) {
    const key = `${r.year}-${r.month}-${r.pocket_id ?? "rekap"}`;
    if (!map.has(key)) map.set(key, r);
  }
  const all = Array.from(map.values());
  // If pid === undefined (all), return up to limit*? For UI tabs we need per pocket. Caller can group.
  // If pid filtered, slice to limit.
  // If all, group by period and return up to limit distinct periods * pockets? Keep simple: return all deduped, let caller slice.
  if (pid !== undefined) return all.slice(0, limit);
  return all.slice(0, limit * 6);
}

export async function generateMonthlyReport(opts: {
  rtId: string;
  year: number;
  month: number;
  pocketId?: string | null; // null = Rekap RT
  generatedBy?: string | null;
  forceRegenerate?: boolean;
}): Promise<MonthlyReportRow> {
  const { rtId, year, month, generatedBy, forceRegenerate } = opts;
  const pocketId = normalizePocketId(opts.pocketId);
  const supabase = createServiceClient();
  const { period_start, period_end } = getMonthPeriod(year, month);

  // Idempotency: if READY exists and not force, return it
  const existing = await getMonthlyReport(supabase, rtId, year, month, pocketId);
  if (existing && existing.status === "READY" && !forceRegenerate) {
    return existing;
  }
  if (existing && existing.status === "GENERATING" && !forceRegenerate) {
    return existing;
  }

  const version = existing ? existing.version + 1 : 1;

  // Mark GENERATING (upsert)
  let reportId: string;
  const baseInsert: Record<string, unknown> = {
    rt_id: rtId,
    pocket_id: pocketId,
    year,
    month,
    period_start,
    period_end,
    status: "GENERATING",
    opening_balance: 0,
    total_income: 0,
    total_expense: 0,
    total_transfer_in: 0,
    total_transfer_out: 0,
    closing_balance: 0,
    transaction_count: 0,
    version,
    generated_by: generatedBy ?? null,
  };
  if (existing && forceRegenerate) {
    const { data, error } = await supabase.from("monthly_reports").insert(baseInsert).select("id").single();
    if (error) {
      if (isMissingColumnError(error)) throw new Error("Kolom pocket_id belum ada. Jalankan migrasi 008_add_pocket_to_monthly_reports.sql di Supabase SQL Editor.");
      throw new Error(error.message);
    }
    reportId = (data as { id: string }).id;
  } else if (existing) {
    const { error } = await supabase.from("monthly_reports").update({ status: "GENERATING", updated_at: new Date().toISOString() }).eq("id", existing.id);
    if (error) throw new Error(error.message);
    reportId = existing.id;
  } else {
    const { data, error } = await supabase.from("monthly_reports").insert(baseInsert).select("id").single();
    if (error) {
      if (isMissingColumnError(error)) throw new Error("Kolom pocket_id belum ada. Jalankan migrasi 008_add_pocket_to_monthly_reports.sql di Supabase SQL Editor.");
      throw new Error(error.message);
    }
    reportId = (data as { id: string }).id;
  }

  try {
    // Calculate snapshot: per-kantong or rekap
    let snapshot: {
      rt_id: string; year: number; month: number; period_start: string; period_end: string;
      opening_balance: number; total_income: number; total_expense: number; total_transfer_in: number; total_transfer_out: number; closing_balance: number; transaction_count: number;
      pockets: { pocket_id: string; pocket_name: string; opening_balance: number; total_income: number; total_expense: number; total_transfer_in: number; total_transfer_out: number; closing_balance: number; transaction_count: number }[];
      pocket_name?: string; pocket_id?: string | null;
    };
    let pocketName: string | null = null;
    let pocketColor: string | null = null;
    if (pocketId) {
      const pSnap = await calculatePocketMonthlySnapshot(supabase, rtId, pocketId, year, month);
      // Fetch pocket meta for name/color
      const { data: pMeta } = await supabase.from("pockets").select("name, color").eq("id", pocketId).maybeSingle();
      pocketName = (pMeta as { name?: string } | null)?.name ?? pSnap.pocket_name;
      pocketColor = (pMeta as { color?: string } | null)?.color ?? null;
      snapshot = {
        rt_id: rtId, year, month, period_start, period_end,
        opening_balance: pSnap.opening_balance, total_income: pSnap.total_income, total_expense: pSnap.total_expense,
        total_transfer_in: pSnap.total_transfer_in, total_transfer_out: pSnap.total_transfer_out,
        closing_balance: pSnap.closing_balance, transaction_count: pSnap.transaction_count,
        pockets: [{ pocket_id: pSnap.pocket_id, pocket_name: pSnap.pocket_name, opening_balance: pSnap.opening_balance, total_income: pSnap.total_income, total_expense: pSnap.total_expense, total_transfer_in: pSnap.total_transfer_in, total_transfer_out: pSnap.total_transfer_out, closing_balance: pSnap.closing_balance, transaction_count: pSnap.transaction_count }],
        pocket_name: pocketName, pocket_id: pocketId,
      };
    } else {
      const rSnap = await calculateMonthlySnapshot(supabase, rtId, year, month);
      snapshot = rSnap;
      pocketName = null;
    }

    const recomputed = snapshot.opening_balance + snapshot.total_income - snapshot.total_expense + snapshot.total_transfer_in - snapshot.total_transfer_out;
    if (Math.abs(recomputed - snapshot.closing_balance) > 0.01) throw new Error("Inconsistent balance");

    const { data: rtProfile } = await supabase.from("rt_profiles").select("name, rt_number, rw_number").eq("id", rtId).maybeSingle();
    const rtName = (rtProfile as { name?: string } | null)?.name ?? `RT ${String(year).padStart(4, "0")}`;
    const rtNumber = (rtProfile as { rt_number?: string } | null)?.rt_number ?? String(month);
    const rwNumber = (rtProfile as { rw_number?: string } | null)?.rw_number ?? "";

    // Fetch transactions for PDF table — filter by pocket if per-kantong
    let txQuery = supabase.from("transactions").select("id, transaction_date, description, type, amount, pocket:pockets(name), category:categories(name)").eq("rt_id", rtId).gte("transaction_date", period_start).lte("transaction_date", period_end).order("transaction_date", { ascending: true }).order("created_at", { ascending: true });
    if (pocketId) txQuery = txQuery.eq("pocket_id", pocketId) as unknown as typeof txQuery;
    const { data: txs } = await txQuery;
    const txRows = (txs as unknown as { id: string; transaction_date: string; description: string | null; type: string; amount: string; pocket: { name: string } | null; category: { name: string } | null }[] | null) ?? [];

    // Fetch transfers — filter to those touching the pocket if per-kantong
    let trQuery = supabase.from("transfers").select("id, transaction_date, description, amount, from_pocket:pockets!transfers_from_pocket_id_fkey(name), to_pocket:pockets!transfers_to_pocket_id_fkey(name), from_pocket_id, to_pocket_id").eq("rt_id", rtId).gte("transaction_date", period_start).lte("transaction_date", period_end).order("transaction_date", { ascending: true });
    const { data: allTrs } = await trQuery;
    let trRowsRaw = (allTrs as unknown as { id: string; transaction_date: string; description: string | null; amount: string; from_pocket: { name: string } | null; to_pocket: { name: string } | null; from_pocket_id: string; to_pocket_id: string }[] | null) ?? [];
    if (pocketId) {
      trRowsRaw = trRowsRaw.filter((tr) => tr.from_pocket_id === pocketId || tr.to_pocket_id === pocketId);
    }

    const pdfBuffer = await generateMonthlyPdf({
      rtName, rtNumber, rwNumber,
      pocketName,
      isRekap: pocketId === null,
      snapshot: {
        year: snapshot.year, month: snapshot.month, period_start: snapshot.period_start, period_end: snapshot.period_end,
        opening_balance: snapshot.opening_balance, total_income: snapshot.total_income, total_expense: snapshot.total_expense,
        total_transfer_in: snapshot.total_transfer_in, total_transfer_out: snapshot.total_transfer_out,
        closing_balance: snapshot.closing_balance, transaction_count: snapshot.transaction_count,
        pockets: snapshot.pockets,
      },
      transactions: txRows.map((t) => ({
        id: t.id, date: t.transaction_date, description: t.description ?? t.category?.name ?? "-",
        pocket: t.pocket?.name ?? "-", category: t.category?.name ?? "-", type: t.type as "income" | "expense", amount: t.amount,
      })),
      transfers: trRowsRaw.map((tr) => ({
        id: tr.id, date: tr.transaction_date, from: tr.from_pocket?.name ?? "-", to: tr.to_pocket?.name ?? "-", amount: tr.amount, description: tr.description,
      })),
    });

    const excelBuffer = await generateMonthlyExcel({
      rtName, rtNumber, rwNumber,
      pocketName,
      isRekap: pocketId === null,
      snapshot: {
        year: snapshot.year, month: snapshot.month, period_start: snapshot.period_start, period_end: snapshot.period_end,
        opening_balance: snapshot.opening_balance, total_income: snapshot.total_income, total_expense: snapshot.total_expense,
        closing_balance: snapshot.closing_balance, transaction_count: snapshot.transaction_count,
        pockets: snapshot.pockets.map((p) => ({ pocket_name: p.pocket_name, opening_balance: p.opening_balance, total_income: p.total_income, total_expense: p.total_expense, total_transfer_in: p.total_transfer_in, total_transfer_out: p.total_transfer_out, closing_balance: p.closing_balance, transaction_count: p.transaction_count })),
      },
      transactions: txRows.map((t) => ({
        id: t.id, date: t.transaction_date, pocket: t.pocket?.name ?? "-", category: t.category?.name ?? "-", description: t.description ?? "-", type: t.type as "income" | "expense", amount: t.amount,
      })),
      transfers: trRowsRaw.map((tr) => ({
        id: tr.id, date: tr.transaction_date, from: tr.from_pocket?.name ?? "-", to: tr.to_pocket?.name ?? "-", amount: tr.amount, description: tr.description,
      })),
    });

    // Upload to storage — per-kantong path
    const slug = pocketName ? pocketName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") : "rekap";
    const pocketSegment = pocketId ? `${slug}-${pocketId.slice(0, 8)}` : "rekap";
    const pdfPath = `monthly-reports/${rtId}/${pocketSegment}/${year}/${String(month).padStart(2, "0")}/laporan-${slug}-${year}-${String(month).padStart(2, "0")}.pdf`;
    const excelPath = `monthly-reports/${rtId}/${pocketSegment}/${year}/${String(month).padStart(2, "0")}/laporan-${slug}-${year}-${String(month).padStart(2, "0")}.xlsx`;

    const pdfUrl = await uploadReportFile(pdfPath, pdfBuffer, "application/pdf");
    const excelUrl = await uploadReportFile(excelPath, excelBuffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    // Insert pocket snapshots for rekap only (per-kantong reports don't need child table)
    if (pocketId === null) {
      await supabase.from("monthly_report_pockets").delete().eq("monthly_report_id", reportId);
      if (snapshot.pockets.length > 0) {
        const rows = snapshot.pockets.map((p) => ({
          monthly_report_id: reportId, pocket_id: p.pocket_id, pocket_name: p.pocket_name,
          opening_balance: String(p.opening_balance), total_income: String(p.total_income), total_expense: String(p.total_expense),
          total_transfer_in: String(p.total_transfer_in), total_transfer_out: String(p.total_transfer_out),
          closing_balance: String(p.closing_balance), transaction_count: p.transaction_count,
        }));
        const { error: pErr } = await supabase.from("monthly_report_pockets").insert(rows);
        if (pErr && !isMissingTableError(pErr)) throw new Error(pErr.message);
      }
    }

    const { data: updated, error: updErr } = await supabase.from("monthly_reports").update({
      opening_balance: String(snapshot.opening_balance), total_income: String(snapshot.total_income), total_expense: String(snapshot.total_expense),
      total_transfer_in: String(snapshot.total_transfer_in), total_transfer_out: String(snapshot.total_transfer_out),
      closing_balance: String(snapshot.closing_balance), transaction_count: snapshot.transaction_count,
      pdf_url: pdfUrl, excel_url: excelUrl, generated_at: new Date().toISOString(), generated_by: generatedBy ?? null, status: "READY", updated_at: new Date().toISOString(),
    }).eq("id", reportId).select("*").single();
    if (updErr) throw new Error(updErr.message);

    return updated as MonthlyReportRow;
  } catch (e) {
    await supabase.from("monthly_reports").update({ status: "FAILED", updated_at: new Date().toISOString() }).eq("id", reportId);
    throw e;
  }
}

export async function generateAllPocketReports(opts: { rtId: string; year: number; month: number; generatedBy?: string | null }): Promise<MonthlyReportRow[]> {
  const { rtId, year, month, generatedBy } = opts;
  const supabase = createServiceClient();
  const { data: pockets } = await supabase.from("pockets").select("id").eq("rt_id", rtId).eq("is_active", true);
  const pocketIds = ((pockets as { id: string }[] | null) ?? []).map((p) => p.id);
  const results: MonthlyReportRow[] = [];
  for (const pid of pocketIds) {
    try {
      const r = await generateMonthlyReport({ rtId, year, month, pocketId: pid, generatedBy });
      results.push(r);
    } catch (e) {
      console.error(`[generateAllPocketReports] failed for pocket ${pid}`, e);
    }
  }
  // Also generate Rekap
  try {
    const rekap = await generateMonthlyReport({ rtId, year, month, pocketId: null, generatedBy });
    results.push(rekap);
  } catch (e) {
    console.error("[generateAllPocketReports] failed for rekap", e);
  }
  return results;
}

export async function closeMonthlyReport(rtId: string, year: number, month: number, pocketId?: string | null): Promise<MonthlyReportRow> {
  const supabase = createServiceClient();
  const existing = await getMonthlyReport(supabase, rtId, year, month, pocketId);
  if (!existing) throw new Error("Laporan belum ada");
  const { data, error } = await supabase.from("monthly_reports").update({ status: "CLOSED", updated_at: new Date().toISOString() }).eq("id", existing.id).select("*").single();
  if (error) throw new Error(error.message);
  return data as MonthlyReportRow;
}

export async function reopenMonthlyReport(rtId: string, year: number, month: number, pocketId?: string | null): Promise<MonthlyReportRow> {
  const supabase = createServiceClient();
  const existing = await getMonthlyReport(supabase, rtId, year, month, pocketId);
  if (!existing) throw new Error("Laporan belum ada");
  const { data, error } = await supabase.from("monthly_reports").update({ status: "REOPENED", updated_at: new Date().toISOString() }).eq("id", existing.id).select("*").single();
  if (error) throw new Error(error.message);
  return data as MonthlyReportRow;
}

export async function getReportFileUrlSafe(path: string): Promise<string> {
  return getReportFileUrl(path);
}
