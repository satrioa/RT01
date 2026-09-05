import Link from "next/link";
import { BottomNav, BottomNavSpacer } from "@/components/layout/bottom-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createServiceClient } from "@/lib/supabase/service";
import { hasSupabaseEnv, DEV_RT_ID } from "@/lib/env";
import { getMonthlyReport, listMonthlyReports } from "@/lib/reports/monthly-report-service";
import { getMonthPeriod } from "@/lib/reports/monthly-report-calculator";
import { formatRupiah } from "@/lib/format";
import { BarChart3, FileText, Download, Eye, Calendar, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

function getLastNMonths(n: number): { year: number; month: number }[] {
  const out: { year: number; month: number }[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }
  return out;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const selectedYear = sp.year ? Number(sp.year) : now.getFullYear();
  const selectedMonth = sp.month ? Number(sp.month) : now.getMonth() + 1;

  if (!hasSupabaseEnv()) {
    return <div className="mx-auto max-w-[430px] p-5 text-sm text-muted-foreground">Supabase belum dikonfigurasi.</div>;
  }

  const rtId = DEV_RT_ID;
  const supabase = createServiceClient();
  const { data: rtProfile } = await supabase.from("rt_profiles").select("name, rt_number, rw_number").eq("id", rtId).maybeSingle();
  const rtName = (rtProfile as { name?: string } | null)?.name ?? "RT 01";
  const rtNumber = (rtProfile as { rt_number?: string } | null)?.rt_number ?? "01";
  const rwNumber = (rtProfile as { rw_number?: string } | null)?.rw_number ?? "07";

  // Fetch selected month report
  const selectedReport = await getMonthlyReport(supabase, rtId, selectedYear, selectedMonth).catch(() => null);
  const allReports = await listMonthlyReports(supabase, rtId, 12).catch(() => []);

  // Failsafe: if previous completed month has no report, show banner
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevYear = prev.getFullYear();
  const prevMonth = prev.getMonth() + 1;
  const prevReport = await getMonthlyReport(supabase, rtId, prevYear, prevMonth).catch(() => null);
  const showFailsafeBanner = !prevReport && selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1;

  const statusLabel = (s: string) => {
    switch (s) {
      case "READY":
        return "Laporan tersedia";
      case "GENERATING":
        return "Sedang membuat laporan";
      case "FAILED":
        return "Gagal membuat laporan";
      case "CLOSED":
        return "Bulan ditutup";
      case "REOPENED":
        return "Dibuka kembali";
      case "OPEN":
        return "Laporan belum dibuat";
      default:
        return s;
    }
  };

  const statusVariant = (s: string) => {
    if (s === "READY" || s === "CLOSED") return "success" as const;
    if (s === "GENERATING") return "secondary" as const;
    if (s === "FAILED") return "destructive" as const;
    return "outline" as const;
  };

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-background">
        <header className="sticky top-0 z-10 border-b bg-card px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <BarChart3 className="size-4" />
            </span>
            <div>
              <h1 className="text-sm font-semibold">Laporan Bulanan</h1>
              <p className="text-xs text-muted-foreground">
                {rtName} / RW {rwNumber} • {monthLabel(selectedYear, selectedMonth)}
              </p>
            </div>
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-6 p-5 pb-6">
          {/* Month selector */}
          <Card>
            <CardContent className="flex items-center gap-2 p-3">
              <Calendar className="size-4 text-muted-foreground" />
              <span className="text-xs font-medium">Pilih Bulan</span>
              <div className="ml-auto flex gap-1">
                {getLastNMonths(6).map(({ year, month }) => {
                  const isSelected = year === selectedYear && month === selectedMonth;
                  return (
                    <Link
                      key={`${year}-${month}`}
                      href={`/reports?year=${year}&month=${month}`}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
                    >
                      {new Date(year, month - 1, 1).toLocaleDateString("id-ID", { month: "short", year: "2-digit" })}
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {showFailsafeBanner && (
            <Card className="border-warning/30 bg-warning/5">
              <CardContent className="flex gap-3 p-4">
                <AlertTriangle className="size-4 shrink-0 text-warning" />
                <div>
                  <p className="text-xs font-semibold">Laporan {monthLabel(prevYear, prevMonth)} belum tersedia</p>
                  <p className="mt-1 text-xs text-muted-foreground">Bulan lalu telah berakhir. Laporan akan dibuat otomatis. Jika belum muncul, hubungi bendahara.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Featured report for selected month */}
          <section className="space-y-3">
            <h2 className="px-1 text-sm font-semibold">Laporan {monthLabel(selectedYear, selectedMonth)}</h2>
            {selectedReport ? (
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="bg-gradient-to-br from-primary to-primary/80 p-5 text-primary-foreground">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs opacity-70">Saldo Akhir</p>
                        <p className="mt-1 text-2xl font-bold">{formatRupiah(Number(selectedReport.closing_balance))}</p>
                      </div>
                      <Badge variant="secondary" className="rounded-full bg-white/20 text-white border-0">
                        {statusLabel(selectedReport.status)}
                      </Badge>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                      <div className="rounded-xl bg-white/10 p-3">
                        <p className="opacity-70">Pemasukan</p>
                        <p className="mt-1 font-semibold">{formatRupiah(Number(selectedReport.total_income))}</p>
                      </div>
                      <div className="rounded-xl bg-white/10 p-3">
                        <p className="opacity-70">Pengeluaran</p>
                        <p className="mt-1 font-semibold">{formatRupiah(Number(selectedReport.total_expense))}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div>Saldo Awal: <span className="font-medium text-foreground">{formatRupiah(Number(selectedReport.opening_balance))}</span></div>
                      <div>Transaksi: <span className="font-medium text-foreground">{selectedReport.transaction_count}</span></div>
                      <div>Periode: <span className="font-medium text-foreground">{selectedReport.period_start} → {selectedReport.period_end}</span></div>
                      <div>Versi: <span className="font-medium text-foreground">v{selectedReport.version}</span></div>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/reports/${selectedReport.year}/${String(selectedReport.month).padStart(2, "0")}`} className="flex-1">
                        <Button className="w-full rounded-xl">
                          <Eye className="size-4" /> Lihat Laporan
                        </Button>
                      </Link>
                      <Link href={`/api/reports/${selectedReport.year}/${String(selectedReport.month).padStart(2, "0")}/pdf`} className="flex-1">
                        <Button variant="outline" className="w-full rounded-xl">
                          <FileText className="size-4" /> PDF
                        </Button>
                      </Link>
                      <Link href={`/api/reports/${selectedReport.year}/${String(selectedReport.month).padStart(2, "0")}/excel`} className="flex-1">
                        <Button variant="outline" className="w-full rounded-xl">
                          <Download className="size-4" /> Excel
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed">
                <CardContent className="p-6 text-center">
                  <p className="text-sm font-semibold">Laporan belum dibuat</p>
                  <p className="mt-1 text-xs text-muted-foreground">Bulan {monthLabel(selectedYear, selectedMonth)} belum memiliki laporan resmi.</p>
                  <form action={async () => {
                    "use server";
                    const { generateReportAction } = await import("@/lib/actions/monthly-reports");
                    await generateReportAction(selectedYear, selectedMonth);
                  }}>
                    <Button className="mt-4 w-full rounded-xl">Buat Laporan</Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </section>

          {/* Previous reports */}
          <section className="space-y-3">
            <h2 className="px-1 text-sm font-semibold">Laporan Sebelumnya</h2>
            {allReports.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-6 text-center text-xs text-muted-foreground">Belum ada laporan bulanan.</CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {allReports.map((r) => (
                  <Card key={r.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">{monthLabel(r.year, r.month)}</p>
                          <p className="text-xs text-muted-foreground">
                            Saldo Akhir {formatRupiah(Number(r.closing_balance))} • {r.transaction_count} trx
                          </p>
                        </div>
                        <Badge variant={statusVariant(r.status)} className="shrink-0 rounded-full text-xs">
                          {statusLabel(r.status)}
                        </Badge>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Link href={`/reports/${r.year}/${String(r.month).padStart(2, "0")}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full rounded-xl">
                            <Eye className="size-3" /> Lihat
                          </Button>
                        </Link>
                        <Link href={`/api/reports/${r.year}/${String(r.month).padStart(2, "0")}/pdf`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full rounded-xl">
                            PDF
                          </Button>
                        </Link>
                        <Link href={`/api/reports/${r.year}/${String(r.month).padStart(2, "0")}/excel`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full rounded-xl">
                            Excel
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <p className="pb-2 text-center text-[11px] tracking-wide text-muted-foreground">Laporan bulanan adalah dokumen resmi — snapshot tidak berubah setelah bulan ditutup.</p>
        </main>

        <BottomNavSpacer />
      </div>
      <BottomNav />
    </div>
  );
}
