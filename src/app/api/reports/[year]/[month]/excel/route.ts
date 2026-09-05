import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getMonthlyReport } from "@/lib/reports/monthly-report-service";
import { getReportFileBuffer } from "@/lib/reports/storage";
import { getCurrentRtId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ year: string; month: string }> }
) {
  const { year: yStr, month: mStr } = await params;
  const year = Number(yStr);
  const month = Number(mStr);
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return NextResponse.json({ error: "Invalid month" }, { status: 400 });
  }
  const pocket = req.nextUrl.searchParams.get("pocket");

  try {
    const rtId = await getCurrentRtId();
    const supabase = createServiceClient();
    const report = await getMonthlyReport(supabase, rtId, year, month, pocket ?? null);
    if (!report || !report.excel_url) {
      return NextResponse.json({ error: "Laporan belum tersedia" }, { status: 404 });
    }

    const buf = await getReportFileBuffer(report.excel_url);
    if (!buf) return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });

    const slug = pocket && pocket !== "rekap" ? pocket.slice(0, 8) : "rekap";
    return new NextResponse(buf as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="laporan-${slug}-${year}-${String(month).padStart(2, "0")}.xlsx"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (e) {
    console.error("[excel download]", e);
    return NextResponse.json({ error: "Gagal download" }, { status: 500 });
  }
}
