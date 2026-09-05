"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentRtId } from "@/lib/auth";
import { generateMonthlyReport, getMonthlyReport, reopenMonthlyReport, closeMonthlyReport } from "@/lib/reports/monthly-report-service";
import { getReportFileUrl } from "@/lib/reports/storage";

export async function generateReportAction(year: number, month: number, force = false) {
  const rtId = await getCurrentRtId();
  const supabase = createServiceClient();
  // get user id for generated_by
  let generatedBy: string | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    generatedBy = data.user?.id ?? null;
  } catch {}
  // fallback to profile id
  if (!generatedBy) {
    const { data: profile } = await supabase.from("profiles").select("id").eq("rt_id", rtId).limit(1).maybeSingle();
    generatedBy = (profile as { id: string } | null)?.id ?? null;
  }
  const report = await generateMonthlyReport({ rtId, year, month, generatedBy, forceRegenerate: force });
  revalidatePath("/reports");
  revalidatePath("/laporan");
  revalidatePath(`/reports/${year}/${String(month).padStart(2, "0")}`);
  return { ok: true, id: report.id } as const;
}

export async function closeReportAction(year: number, month: number) {
  const rtId = await getCurrentRtId();
  const report = await closeMonthlyReport(rtId, year, month);
  revalidatePath("/reports");
  return { ok: true, id: report.id } as const;
}

export async function reopenReportAction(year: number, month: number) {
  const rtId = await getCurrentRtId();
  const report = await reopenMonthlyReport(rtId, year, month);
  revalidatePath("/reports");
  return { ok: true, id: report.id } as const;
}

export async function getDownloadUrlAction(year: number, month: number, type: "pdf" | "excel") {
  const rtId = await getCurrentRtId();
  const supabase = createServiceClient();
  const report = await getMonthlyReport(supabase, rtId, year, month);
  if (!report) return { ok: false, error: "Laporan belum tersedia" } as const;
  const path = type === "pdf" ? report.pdf_url : report.excel_url;
  if (!path) return { ok: false, error: "File belum tersedia" } as const;
  const url = await getReportFileUrl(path);
  return { ok: true, url } as const;
}
