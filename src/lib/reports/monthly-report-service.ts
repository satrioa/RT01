import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";
import { calculateMonthlySnapshot, getMonthPeriod } from "./monthly-report-calculator";
import { generateMonthlyPdf } from "./pdf-generator";
import { generateMonthlyExcel } from "./excel-generator";
import { uploadReportFile, getReportFileUrl } from "./storage";

export type MonthlyReportStatus = "OPEN" | "GENERATING" | "READY" | "CLOSED" | "REOPENED" | "FAILED";

export interface MonthlyReportRow {
  id: string;
  rt_id: string;
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

export async function getMonthlyReport(
  supabase: SupabaseClient,
  rtId: string,
  year: number,
  month: number
): Promise<MonthlyReportRow | null> {
  const { data, error } = await supabase
    .from("monthly_reports")
    .select("*")
    .eq("rt_id", rtId)
    .eq("year", year)
    .eq("month", month)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    if (isMissingTableError(error)) {
      console.warn("[monthly_reports] table missing — run migration 007. Returning null.");
      return null;
    }
    throw new Error(error.message);
  }
  return (data as MonthlyReportRow | null) ?? null;
}

export async function listMonthlyReports(
  supabase: SupabaseClient,
  rtId: string,
  limit = 12
): Promise<MonthlyReportRow[]> {
  const { data, error } = await supabase
    .from("monthly_reports")
    .select("*")
    .eq("rt_id", rtId)
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .order("version", { ascending: false })
    .limit(limit);
  if (error) {
    if (isMissingTableError(error)) {
      console.warn("[monthly_reports] table missing — run migration 007. Returning []");
      return [];
    }
    throw new Error(error.message);
  }
  // Deduplicate to latest version per month
  const map = new Map<string, MonthlyReportRow>();
  for (const r of (data as MonthlyReportRow[] | null) ?? []) {
    const key = `${r.year}-${r.month}`;
    if (!map.has(key)) map.set(key, r);
  }
  return Array.from(map.values());
}

export async function generateMonthlyReport(opts: {
  rtId: string;
  year: number;
  month: number;
  generatedBy?: string | null;
  forceRegenerate?: boolean;
}): Promise<MonthlyReportRow> {
  const { rtId, year, month, generatedBy, forceRegenerate } = opts;
  const supabase = createServiceClient();
  const { period_start, period_end } = getMonthPeriod(year, month);

  // Idempotency: if READY exists and not force, return it
  const existing = await getMonthlyReport(supabase, rtId, year, month);
  if (existing && existing.status === "READY" && !forceRegenerate) {
    return existing;
  }
  if (existing && existing.status === "GENERATING" && !forceRegenerate) {
    // concurrent generation in progress — return existing
    return existing;
  }

  const version = existing ? existing.version + 1 : 1;

  // Mark GENERATING (upsert)
  let reportId: string;
  if (existing && forceRegenerate) {
    // keep same id? For version history we create new row; but to keep idempotent we create new version row
    const { data, error } = await supabase
      .from("monthly_reports")
      .insert({
        rt_id: rtId,
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
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    reportId = (data as { id: string }).id;
  } else if (existing) {
    // update existing to GENERATING (for retry)
    const { error } = await supabase
      .from("monthly_reports")
      .update({ status: "GENERATING", updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    reportId = existing.id;
  } else {
    const { data, error } = await supabase
      .from("monthly_reports")
      .insert({
        rt_id: rtId,
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
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    reportId = (data as { id: string }).id;
  }

  try {
    const snapshot = await calculateMonthlySnapshot(supabase, rtId, year, month);

    // Verify consistency
    const recomputed = snapshot.opening_balance + snapshot.total_income - snapshot.total_expense + snapshot.total_transfer_in - snapshot.total_transfer_out;
    if (Math.abs(recomputed - snapshot.closing_balance) > 0.01) {
      throw new Error("Inconsistent balance");
    }

    // Fetch RT profile for PDF header
    const { data: rtProfile } = await supabase.from("rt_profiles").select("name, rt_number, rw_number").eq("id", rtId).maybeSingle();
    const rtName = (rtProfile as { name?: string } | null)?.name ?? `RT ${String(year).padStart(4, "0")}`;
    const rtNumber = (rtProfile as { rt_number?: string } | null)?.rt_number ?? String(month);
    const rwNumber = (rtProfile as { rw_number?: string } | null)?.rw_number ?? "";

    // Fetch transactions for detailed PDF table
    const { data: txs } = await supabase
      .from("transactions")
      .select("id, transaction_date, description, type, amount, pocket:pockets(name), category:categories(name)")
      .eq("rt_id", rtId)
      .gte("transaction_date", period_start)
      .lte("transaction_date", period_end)
      .order("transaction_date", { ascending: true })
      .order("created_at", { ascending: true });

    const txRows = (txs as unknown as { id: string; transaction_date: string; description: string | null; type: string; amount: string; pocket: { name: string } | null; category: { name: string } | null }[] | null) ?? [];

    // Fetch transfers for report
    const { data: trs } = await supabase
      .from("transfers")
      .select("id, transaction_date, description, amount, from_pocket:pockets!transfers_from_pocket_id_fkey(name), to_pocket:pockets!transfers_to_pocket_id_fkey(name)")
      .eq("rt_id", rtId)
      .gte("transaction_date", period_start)
      .lte("transaction_date", period_end)
      .order("transaction_date", { ascending: true });

    // Generate PDF & Excel
    const pdfBuffer = await generateMonthlyPdf({
      rtName,
      rtNumber,
      rwNumber,
      snapshot,
      transactions: txRows.map((t) => ({
        id: t.id,
        date: t.transaction_date,
        description: t.description ?? t.category?.name ?? "-",
        pocket: t.pocket?.name ?? "-",
        category: t.category?.name ?? "-",
        type: t.type as "income" | "expense",
        amount: t.amount,
      })),
      transfers: ((trs as unknown as { id: string; transaction_date: string; description: string | null; amount: string; from_pocket: { name: string } | null; to_pocket: { name: string } | null }[] | null) ?? []).map((tr) => ({
        id: tr.id,
        date: tr.transaction_date,
        from: tr.from_pocket?.name ?? "-",
        to: tr.to_pocket?.name ?? "-",
        amount: tr.amount,
        description: tr.description,
      })),
    });

    const excelBuffer = await generateMonthlyExcel({
      rtName,
      rtNumber,
      rwNumber,
      snapshot,
      transactions: txRows.map((t) => ({
        id: t.id,
        date: t.transaction_date,
        pocket: t.pocket?.name ?? "-",
        category: t.category?.name ?? "-",
        description: t.description ?? "-",
        type: t.type as "income" | "expense",
        amount: t.amount,
      })),
      transfers: ((trs as unknown as { id: string; transaction_date: string; description: string | null; amount: string; from_pocket: { name: string } | null; to_pocket: { name: string } | null }[] | null) ?? []).map((tr) => ({
        id: tr.id,
        date: tr.transaction_date,
        from: tr.from_pocket?.name ?? "-",
        to: tr.to_pocket?.name ?? "-",
        amount: tr.amount,
        description: tr.description,
      })),
    });

    // Upload to storage
    const pdfPath = `monthly-reports/${rtId}/${year}/${String(month).padStart(2, "0")}/laporan-keuangan-${year}-${String(month).padStart(2, "0")}.pdf`;
    const excelPath = `monthly-reports/${rtId}/${year}/${String(month).padStart(2, "0")}/laporan-keuangan-${year}-${String(month).padStart(2, "0")}.xlsx`;

    const pdfUrl = await uploadReportFile(pdfPath, pdfBuffer, "application/pdf");
    const excelUrl = await uploadReportFile(excelPath, excelBuffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    // Insert pocket snapshots (delete old for this report version if regenerating same id)
    await supabase.from("monthly_report_pockets").delete().eq("monthly_report_id", reportId);
    if (snapshot.pockets.length > 0) {
      const rows = snapshot.pockets.map((p) => ({
        monthly_report_id: reportId,
        pocket_id: p.pocket_id,
        pocket_name: p.pocket_name,
        opening_balance: String(p.opening_balance),
        total_income: String(p.total_income),
        total_expense: String(p.total_expense),
        total_transfer_in: String(p.total_transfer_in),
        total_transfer_out: String(p.total_transfer_out),
        closing_balance: String(p.closing_balance),
        transaction_count: p.transaction_count,
      }));
      const { error: pErr } = await supabase.from("monthly_report_pockets").insert(rows);
      if (pErr) throw new Error(pErr.message);
    }

    // Update report row to READY
    const { data: updated, error: updErr } = await supabase
      .from("monthly_reports")
      .update({
        opening_balance: String(snapshot.opening_balance),
        total_income: String(snapshot.total_income),
        total_expense: String(snapshot.total_expense),
        total_transfer_in: String(snapshot.total_transfer_in),
        total_transfer_out: String(snapshot.total_transfer_out),
        closing_balance: String(snapshot.closing_balance),
        transaction_count: snapshot.transaction_count,
        pdf_url: pdfUrl,
        excel_url: excelUrl,
        generated_at: new Date().toISOString(),
        generated_by: generatedBy ?? null,
        status: "READY",
        updated_at: new Date().toISOString(),
      })
      .eq("id", reportId)
      .select("*")
      .single();
    if (updErr) throw new Error(updErr.message);

    return updated as MonthlyReportRow;
  } catch (e) {
    await supabase.from("monthly_reports").update({ status: "FAILED", updated_at: new Date().toISOString() }).eq("id", reportId);
    throw e;
  }
}

export async function closeMonthlyReport(rtId: string, year: number, month: number): Promise<MonthlyReportRow> {
  const supabase = createServiceClient();
  const existing = await getMonthlyReport(supabase, rtId, year, month);
  if (!existing) throw new Error("Laporan belum ada");
  const { data, error } = await supabase.from("monthly_reports").update({ status: "CLOSED", updated_at: new Date().toISOString() }).eq("id", existing.id).select("*").single();
  if (error) throw new Error(error.message);
  return data as MonthlyReportRow;
}

export async function reopenMonthlyReport(rtId: string, year: number, month: number): Promise<MonthlyReportRow> {
  const supabase = createServiceClient();
  const existing = await getMonthlyReport(supabase, rtId, year, month);
  if (!existing) throw new Error("Laporan belum ada");
  const { data, error } = await supabase.from("monthly_reports").update({ status: "REOPENED", updated_at: new Date().toISOString() }).eq("id", existing.id).select("*").single();
  if (error) throw new Error(error.message);
  return data as MonthlyReportRow;
}

export async function getReportFileUrlSafe(path: string): Promise<string> {
  return getReportFileUrl(path);
}
