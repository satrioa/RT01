"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentRtId } from "@/lib/auth";
import { generateMonthlyReport, getMonthlyReport, reopenMonthlyReport, closeMonthlyReport } from "@/lib/reports/monthly-report-service";
import { getReportFileUrl } from "@/lib/reports/storage";

export async function generateReportAction(year: number, month: number, pocketId?: string | null, force = false) {
  const rtId = await getCurrentRtId();
  const supabase = createServiceClient();
  let generatedBy: string | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    generatedBy = data.user?.id ?? null;
  } catch {}
  if (!generatedBy) {
    const { data: profile } = await supabase.from("profiles").select("id").eq("rt_id", rtId).limit(1).maybeSingle();
    generatedBy = (profile as { id: string } | null)?.id ?? null;
  }
  const report = await generateMonthlyReport({ rtId, year, month, pocketId: pocketId ?? null, generatedBy, forceRegenerate: force });
  revalidatePath("/reports");
  revalidatePath("/laporan");
  revalidatePath(`/reports/${year}/${String(month).padStart(2, "0")}`);
  return { ok: true, id: report.id } as const;
}

export async function generateAllReportsAction(year: number, month: number) {
  const rtId = await getCurrentRtId();
  const supabase = createServiceClient();
  let generatedBy: string | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    generatedBy = data.user?.id ?? null;
  } catch {}
  const { generateAllPocketReports } = await import("@/lib/reports/monthly-report-service");
  const reports = await generateAllPocketReports({ rtId, year, month, generatedBy });
  revalidatePath("/reports");
  return { ok: true, count: reports.length } as const;
}

export async function closeReportAction(year: number, month: number, pocketId?: string | null) {
  const rtId = await getCurrentRtId();
  const report = await closeMonthlyReport(rtId, year, month, pocketId ?? null);
  revalidatePath("/reports");
  return { ok: true, id: report.id } as const;
}

export async function reopenReportAction(year: number, month: number, pocketId?: string | null) {
  const rtId = await getCurrentRtId();
  const report = await reopenMonthlyReport(rtId, year, month, pocketId ?? null);
  revalidatePath("/reports");
  return { ok: true, id: report.id } as const;
}

export async function getDownloadUrlAction(year: number, month: number, type: "pdf" | "excel", pocketId?: string | null) {
  const rtId = await getCurrentRtId();
  const supabase = createServiceClient();
  const report = await getMonthlyReport(supabase, rtId, year, month, pocketId ?? null);
  if (!report) return { ok: false, error: "Laporan belum tersedia" } as const;
  const path = type === "pdf" ? report.pdf_url : report.excel_url;
  if (!path) return { ok: false, error: "File belum tersedia" } as const;
  const url = await getReportFileUrl(path);
  return { ok: true, url } as const;
}
