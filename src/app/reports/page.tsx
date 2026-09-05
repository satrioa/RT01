import Link from "next/link";
import { BottomNav, BottomNavSpacer } from "@/components/layout/bottom-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createServiceClient } from "@/lib/supabase/service";
import { hasSupabaseEnv, DEV_RT_ID } from "@/lib/env";
import { getMonthlyReport, listMonthlyReports } from "@/lib/reports/monthly-report-service";
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
  searchParams: Promise<{ year?: string; month?: string; pocket?: string }>;
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
  const rwNumber = (rtProfile as { rw_number?: string } | null)?.rw_number ?? "07";

  // Fetch active pockets for tabs (dinamis)
  const { data: pocketsData } = await supabase.from("pockets").select("id, name, color").eq("rt_id", rtId).eq("is_active", true).order("sort_order", { ascending: true });
  const pockets = (pocketsData as { id: string; name: string; color: string | null }[] | null) ?? [];
  const pocketParam = sp.pocket ?? (pockets[0]?.id ?? "rekap");
  const selectedPocketId = pocketParam === "rekap" ? null : pocketParam;
  const selectedPocket = pockets.find((p) => p.id === pocketParam) ?? null;
  const isRekap = selectedPocketId === null;

  // Fetch selected month report for selected pocket/rekap
  const selectedReport = await getMonthlyReport(supabase, rtId, selectedYear, selectedMonth, selectedPocketId).catch(() => null);
  const allReports = await listMonthlyReports(supabase, rtId, { pocketId: selectedPocketId, limit: 12 }).catch(() => []);

  // Failsafe: if previous completed month has no report for this pocket
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevYear = prev.getFullYear();
  const prevMonth = prev.getMonth() + 1;
  const prevReport = await getMonthlyReport(supabase, rtId, prevYear, prevMonth, selectedPocketId).catch(() => null);
  const showFailsafeBanner = !prevReport && selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1;

  const statusLabel = (s: string) => {
    switch (s) {
      case "READY": return "Laporan tersedia";
      case "GENERATING": return "Sedang membuat laporan";
      case "FAILED": return "Gagal membuat laporan";
      case "CLOSED": return "Bulan ditutup";
      case "REOPENED": return "Dibuka kembali";
      case "OPEN": return "Laporan belum dibuat";
      default: return s;
    }
  };
  const statusVariant = (s: string) => {
    if (s === "READY" || s === "CLOSED") return "success" as const;
    if (s === "GENERATING") return "secondary" as const;
    if (s === "FAILED") return "destructive" as const;
    return "outline" as const;
  };

  const tabHref = (pocketId: string | null) => `/reports?year=${selectedYear}&month=${selectedMonth}&pocket=${pocketId ?? "rekap"}`;

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
                {rtName} / RW {rwNumber} • {monthLabel(selectedYear, selectedMonth)}{selectedPocket ? ` • ${selectedPocket.name}` : isRekap ? " • Rekap" : ""}
              </p>
            </div>
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-6 p-5 pb-6">
          {/* Pocket tabs — dinamis */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {pockets.map((p) => {
              const isActive = p.id === pocketParam;
              return (
                <Link
                  key={p.id}
                  href={tabHref(p.id)}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
                  style={isActive && p.color ? { backgroundColor: p.color, color: "#fff" } : undefined}
                >
                  {p.name}
                </Link>
              );
            })}
            <Link
              href={tabHref(null)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${isRekap ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
            >
              Rekap RT
            </Link>
          </div>

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
                      href={`/reports?year=${year}&month=${month}&pocket=${pocketParam}`}
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
                  <p className="text-xs font-semibold">Laporan {monthLabel(prevYear, prevMonth)} {isRekap ? "Rekap" : selectedPocket?.name} belum tersedia</p>
                  <p className="mt-1 text-xs text-muted-foreground">Bulan lalu telah berakhir. Laporan akan dibuat otomatis. Jika belum muncul, hubungi bendahara.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Featured report for selected month + pocket */}
          <section className="space-y-3">
            <h2 className="px-1 text-sm font-semibold">Laporan {monthLabel(selectedYear, selectedMonth)} {isRekap ? "— Rekap" : `— ${selectedPocket?.name ?? ""}`}</h2>
            {selectedReport ? (
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="bg-gradient-to-br from-primary to-primary/80 p-5 text-primary-foreground" style={selectedPocket?.color ? { background: `linear-gradient(135deg, ${selectedPocket.color}, ${selectedPocket.color}CC)` } : undefined}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs opacity-70">{isRekap ? "Saldo Akhir Rekap" : `Saldo Akhir ${selectedPocket?.name}`}</p>
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
                      <Link href={`/reports/${selectedReport.year}/${String(selectedReport.month).padStart(2, "0")}?pocket=${selectedPocketId ?? "rekap"}`} className="flex-1">
                        <Button className="w-full rounded-xl">
                          <Eye className="size-4" /> Lihat Laporan
                        </Button>
                      </Link>
                      <Link href={`/api/reports/${selectedReport.year}/${String(selectedReport.month).padStart(2, "0")}/pdf?pocket=${selectedPocketId ?? "rekap"}`} className="flex-1">
                        <Button variant="outline" className="w-full rounded-xl">
                          <FileText className="size-4" /> PDF
                        </Button>
                      </Link>
                      <Link href={`/api/reports/${selectedReport.year}/${String(selectedReport.month).padStart(2, "0")}/excel?pocket=${selectedPocketId ?? "rekap"}`} className="flex-1">
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
                  <p className="mt-1 text-xs text-muted-foreground">Bulan {monthLabel(selectedYear, selectedMonth)} {isRekap ? "Rekap" : selectedPocket?.name} belum memiliki laporan.</p>
                  <form action={async () => {
                    "use server";
                    const { generateReportAction, generateAllReportsAction } = await import("@/lib/actions/monthly-reports");
                    if (isRekap) {
                      // For rekap, generate rekap only; user can use "Buat Semua" for all pockets if needed
                      await generateReportAction(selectedYear, selectedMonth, null);
                    } else {
                      await generateReportAction(selectedYear, selectedMonth, selectedPocketId);
                    }
                  }}>
                    <Button className="mt-4 w-full rounded-xl">Buat Laporan {isRekap ? "Rekap" : selectedPocket?.name}</Button>
                  </form>
                  {isRekap && pockets.length > 0 && (
                    <form action={async () => {
                      "use server";
                      const { generateAllReportsAction } = await import("@/lib/actions/monthly-reports");
                      await generateAllReportsAction(selectedYear, selectedMonth);
                    }}>
                      <Button variant="outline" className="mt-2 w-full rounded-xl">Buat Semua Kantong + Rekap</Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            )}
          </section>

          {/* Previous reports for selected pocket */}
          <section className="space-y-3">
            <h2 className="px-1 text-sm font-semibold">Laporan Sebelumnya {isRekap ? "— Rekap" : `— ${selectedPocket?.name ?? ""}`}</h2>
            {allReports.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-6 text-center text-xs text-muted-foreground">Belum ada laporan {isRekap ? "rekap" : selectedPocket?.name}.</CardContent>
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
                        <Link href={`/reports/${r.year}/${String(r.month).padStart(2, "0")}?pocket=${r.pocket_id ?? "rekap"}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full rounded-xl">
                            <Eye className="size-3" /> Lihat
                          </Button>
                        </Link>
                        <Link href={`/api/reports/${r.year}/${String(r.month).padStart(2, "0")}/pdf?pocket=${r.pocket_id ?? "rekap"}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full rounded-xl">
                            PDF
                          </Button>
                        </Link>
                        <Link href={`/api/reports/${r.year}/${String(r.month).padStart(2, "0")}/excel?pocket=${r.pocket_id ?? "rekap"}`} className="flex-1">
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

          <p className="pb-2 text-center text-[11px] tracking-wide text-muted-foreground">Laporan bulanan per-kantong + Rekap — snapshot tidak berubah setelah bulan ditutup.</p>
        </main>

        <BottomNavSpacer />
      </div>
      <BottomNav />
    </div>
  );
}
