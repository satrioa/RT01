import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { hasSupabaseEnv, DEV_RT_ID } from "@/lib/env";
import { getMonthlyReport } from "@/lib/reports/monthly-report-service";
import { formatRupiah } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BottomNav, BottomNavSpacer } from "@/components/layout/bottom-nav";
import { ArrowLeft, Download, FileText, Wallet } from "lucide-react";
import { ReportActions } from "@/components/reports/report-actions";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale/id";

export const dynamic = "force-dynamic";

export default async function MonthlyReportDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ year: string; month: string }>;
  searchParams: Promise<{ pocket?: string }>;
}) {
  const { year: yStr, month: mStr } = await params;
  const sp = await searchParams;
  const year = Number(yStr);
  const month = Number(mStr);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) notFound();

  if (!hasSupabaseEnv()) {
    return <div className="mx-auto max-w-[430px] p-5 text-sm">Supabase belum dikonfigurasi.</div>;
  }

  const supabase = createServiceClient();
  const rtId = DEV_RT_ID;
  const pocketParam = sp.pocket ?? "rekap";
  const pocketId = pocketParam === "rekap" ? null : pocketParam;
  const report = await getMonthlyReport(supabase, rtId, year, month, pocketId).catch(() => null);
  if (!report) notFound();

  const isRekap = report.pocket_id === null;
  let pocketMeta: { name: string; color: string | null } | null = null;
  if (report.pocket_id) {
    const { data: p } = await supabase.from("pockets").select("name, color").eq("id", report.pocket_id).maybeSingle();
    pocketMeta = (p as { name: string; color: string | null } | null) ?? null;
  }
  const pocketName = pocketMeta?.name ?? (isRekap ? "Rekap RT" : "Kantong");

  const { data: pockets } = isRekap
    ? await supabase.from("monthly_report_pockets").select("*").eq("monthly_report_id", report.id).order("pocket_name")
    : { data: null as unknown as null };
  const { data: rtProfile } = await supabase.from("rt_profiles").select("name, rt_number, rw_number").eq("id", rtId).maybeSingle();
  const rtName = (rtProfile as { name?: string } | null)?.name ?? "RT 01";
  const rwNumber = (rtProfile as { rw_number?: string } | null)?.rw_number ?? "07";
  const monthLabel = format(new Date(year, month - 1, 1), "MMMM yyyy", { locale: localeId });
  const periodLabel = `${format(new Date(report.period_start), "d MMMM yyyy", { locale: localeId })} – ${format(new Date(report.period_end), "d MMMM yyyy", { locale: localeId })}`;

  const pocketRows = (pockets as { pocket_name: string; closing_balance: string; opening_balance: string; total_income: string; total_expense: string }[] | null) ?? [];

  // Fetch transactions for preview — filter by pocket if per-kantong
  let txQuery = supabase.from("transactions").select("transaction_date, description, type, amount, pocket:pockets(name), category:categories(name)").eq("rt_id", rtId).gte("transaction_date", report.period_start).lte("transaction_date", report.period_end).order("transaction_date", { ascending: true }).limit(50);
  if (report.pocket_id) txQuery = txQuery.eq("pocket_id", report.pocket_id) as unknown as typeof txQuery;
  const { data: txs } = await txQuery;

  const pdfHref = `/api/reports/${year}/${String(month).padStart(2, "0")}/pdf?pocket=${report.pocket_id ?? "rekap"}`;
  const excelHref = `/api/reports/${year}/${String(month).padStart(2, "0")}/excel?pocket=${report.pocket_id ?? "rekap"}`;

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-background">
        <header className="flex items-center gap-3 border-b bg-card px-5 py-4">
          <Link href={`/reports?pocket=${report.pocket_id ?? "rekap"}&year=${year}&month=${month}`} className="flex size-9 items-center justify-center rounded-full border bg-card">
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h1 className="text-sm font-semibold">Laporan {isRekap ? "Rekap" : pocketName}</h1>
            <p className="text-xs text-muted-foreground">{monthLabel} • {rtName} / RW {rwNumber}{!isRekap ? ` • ${pocketName}` : ""}</p>
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-4 p-5 pb-6">
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Periode: {periodLabel}</CardTitle>
              <p className="text-xs text-muted-foreground">{isRekap ? "Rekap Gabungan" : `Kantong: ${pocketName}`} • Versi {report.version} • {report.status}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Saldo Awal</p>
                  <p className="mt-1 text-sm font-bold">{formatRupiah(Number(report.opening_balance))}</p>
                </div>
                <div className="rounded-xl bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Saldo Akhir</p>
                  <p className="mt-1 text-sm font-bold text-primary">{formatRupiah(Number(report.closing_balance))}</p>
                </div>
                <div className="rounded-xl bg-success/10 p-3">
                  <p className="text-xs text-muted-foreground">Pemasukan</p>
                  <p className="mt-1 text-sm font-semibold text-success">{formatRupiah(Number(report.total_income))}</p>
                </div>
                <div className="rounded-xl bg-destructive/10 p-3">
                  <p className="text-xs text-muted-foreground">Pengeluaran</p>
                  <p className="mt-1 text-sm font-semibold text-destructive">{formatRupiah(Number(report.total_expense))}</p>
                </div>
              </div>
              <div className="rounded-xl border bg-card p-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Surplus / Defisit</span>
                  <span className={`font-semibold ${Number(report.total_income) - Number(report.total_expense) >= 0 ? "text-success" : "text-destructive"}`}>{formatRupiah(Number(report.total_income) - Number(report.total_expense))}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-muted-foreground">Transaksi</span>
                  <span className="font-medium">{report.transaction_count}</span>
                </div>
                {!isRekap && (
                  <div className="flex justify-between mt-1">
                    <span className="text-muted-foreground">Transfer</span>
                    <span className="font-medium">Masuk {formatRupiah(Number(report.total_transfer_in))} • Keluar {formatRupiah(Number(report.total_transfer_out))}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Link href={pdfHref} className="flex-1">
                  <Button className="w-full rounded-xl">
                    <FileText className="size-4" /> Download PDF
                  </Button>
                </Link>
                <Link href={excelHref} className="flex-1">
                  <Button variant="outline" className="w-full rounded-xl">
                    <Download className="size-4" /> Download Excel
                  </Button>
                </Link>
              </div>
              <div className="pt-2">
                <ReportActions year={year} month={month} pocketId={report.pocket_id} status={report.status} />
              </div>
            </CardContent>
          </Card>

          {isRekap ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Wallet className="size-4" /> Ringkasan Kantong
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {pocketRows.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Tidak ada kantong.</p>
                ) : (
                  pocketRows.map((p) => (
                    <div key={p.pocket_name} className="flex items-center justify-between rounded-xl border bg-card px-3 py-2">
                      <div>
                        <p className="text-sm font-medium">{p.pocket_name}</p>
                        <p className="text-xs text-muted-foreground">Saldo Akhir {formatRupiah(Number(p.closing_balance))}</p>
                      </div>
                      <Badge variant="outline" className="rounded-full">{formatRupiah(Number(p.closing_balance))}</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Transaksi ({(txs as unknown[] | null)?.length ?? 0}) {isRekap ? "— semua kantong" : `— ${pocketName}`}</CardTitle>
              <p className="text-xs text-muted-foreground">{isRekap ? "Kolom Kantong ditampilkan di Laporan Rekap" : "Kolom Kategori ditampilkan di Laporan per-kantong"}</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {((txs as unknown as { transaction_date: string; description: string | null; type: string; amount: string; pocket: { name: string } | null; category: { name: string } | null }[] | null) ?? []).slice(0, 20).map((t, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl border px-3 py-2 text-xs">
                  <div>
                    <p className="font-medium">{t.description ?? "-"}</p>
                    <p className="text-muted-foreground">{t.transaction_date} • {isRekap ? (t.pocket?.name ?? "-") : (t.category?.name ?? "-")}</p>
                  </div>
                  <span className={t.type === "income" ? "text-success font-semibold" : "text-destructive font-semibold"}>{t.type === "income" ? "+" : "-"}{formatRupiah(Number(t.amount))}</span>
                </div>
              ))}
              <p className="text-center text-[11px] text-muted-foreground">Pratinjau 20 transaksi • PDF {isRekap ? "Rekap menampilkan kolom Kantong" : "per-kantong menampilkan kolom Kategori"}.</p>
            </CardContent>
          </Card>

          <Card className="border-dashed bg-muted/20">
            <CardContent className="p-4 text-center text-xs leading-relaxed text-muted-foreground">
              <p className="font-medium text-foreground">Tanda Tangan</p>
              <p className="mt-3">Mengetahui, KETUA {rtName.toUpperCase()} &nbsp;&nbsp;|&nbsp;&nbsp; Dilaporkan, BENDAHARA {rtName.toUpperCase()}</p>
            </CardContent>
          </Card>
        </main>

        <BottomNavSpacer />
      </div>
      <BottomNav />
    </div>
  );
}
