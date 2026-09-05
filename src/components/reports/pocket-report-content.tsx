"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRupiah } from "@/lib/format";
import { generateReportAction, generateAllReportsAction } from "@/lib/actions/monthly-reports";
import type { MonthlyReportRow } from "@/lib/reports/monthly-report-service";
import { FileText, Download, Eye, AlertTriangle } from "lucide-react";

function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

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

export type PocketReportData = {
  selected: MonthlyReportRow | null;
  list: MonthlyReportRow[];
  prev: MonthlyReportRow | null;
  showFailsafe: boolean;
};

export function PocketReportContent({
  pocket,
  isRekap,
  data,
  year,
  month,
  prevYear,
  prevMonth,
  pocketsCount,
}: {
  pocket: { id: string; name: string; color: string | null } | null;
  isRekap: boolean;
  data: PocketReportData;
  year: number;
  month: number;
  prevYear: number;
  prevMonth: number;
  pocketsCount: number;
}) {
  const router = useRouter();
  const [generating, setGenerating] = React.useState(false);
  const [generatingAll, setGeneratingAll] = React.useState(false);

  const { selected, list, showFailsafe } = data;

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generateReportAction(year, month, isRekap ? null : pocket?.id ?? null);
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateAll = async () => {
    setGeneratingAll(true);
    try {
      await generateAllReportsAction(year, month);
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingAll(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {showFailsafe && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="flex gap-3 p-4">
            <AlertTriangle className="size-4 shrink-0 text-warning" />
            <div>
              <p className="text-xs font-semibold">
                Laporan {monthLabel(prevYear, prevMonth)} {isRekap ? "Rekap" : pocket?.name} belum tersedia
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Bulan lalu telah berakhir. Laporan akan dibuat otomatis. Jika belum muncul, hubungi bendahara.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Featured report for selected month + pocket */}
      <section className="space-y-3">
        <h2 className="px-1 text-sm font-semibold">
          Laporan {monthLabel(year, month)} {isRekap ? "— Rekap" : `— ${pocket?.name ?? ""}`}
        </h2>
        {selected ? (
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div
                className="bg-gradient-to-br from-primary to-primary/80 p-5 text-primary-foreground"
                style={pocket?.color ? { background: `linear-gradient(135deg, ${pocket.color}, ${pocket.color}CC)` } : undefined}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs opacity-70">{isRekap ? "Saldo Akhir Rekap" : `Saldo Akhir ${pocket?.name}`}</p>
                    <p className="mt-1 text-2xl font-bold">{formatRupiah(Number(selected.closing_balance))}</p>
                  </div>
                  <Badge variant="secondary" className="rounded-full bg-white/20 text-white border-0">
                    {statusLabel(selected.status)}
                  </Badge>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl bg-white/10 p-3">
                    <p className="opacity-70">Pemasukan</p>
                    <p className="mt-1 font-semibold">{formatRupiah(Number(selected.total_income))}</p>
                  </div>
                  <div className="rounded-xl bg-white/10 p-3">
                    <p className="opacity-70">Pengeluaran</p>
                    <p className="mt-1 font-semibold">{formatRupiah(Number(selected.total_expense))}</p>
                  </div>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>
                    Saldo Awal: <span className="font-medium text-foreground">{formatRupiah(Number(selected.opening_balance))}</span>
                  </div>
                  <div>
                    Transaksi: <span className="font-medium text-foreground">{selected.transaction_count}</span>
                  </div>
                  <div>
                    Periode: <span className="font-medium text-foreground">{selected.period_start} → {selected.period_end}</span>
                  </div>
                  <div>
                    Versi: <span className="font-medium text-foreground">v{selected.version}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/reports/${selected.year}/${String(selected.month).padStart(2, "0")}?pocket=${isRekap ? "rekap" : pocket?.id}`} className="flex-1">
                    <Button className="w-full rounded-xl">
                      <Eye className="size-4" /> Lihat Laporan
                    </Button>
                  </Link>
                  <Link href={`/api/reports/${selected.year}/${String(selected.month).padStart(2, "0")}/pdf?pocket=${isRekap ? "rekap" : pocket?.id}`} className="flex-1">
                    <Button variant="outline" className="w-full rounded-xl">
                      <FileText className="size-4" /> PDF
                    </Button>
                  </Link>
                  <Link href={`/api/reports/${selected.year}/${String(selected.month).padStart(2, "0")}/excel?pocket=${isRekap ? "rekap" : pocket?.id}`} className="flex-1">
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
              <p className="mt-1 text-xs text-muted-foreground">Bulan {monthLabel(year, month)} {isRekap ? "Rekap" : pocket?.name} belum memiliki laporan.</p>
              <Button className="mt-4 w-full rounded-xl" onClick={handleGenerate} disabled={generating}>
                {generating ? "Membuat..." : `Buat Laporan ${isRekap ? "Rekap" : pocket?.name}`}
              </Button>
              {isRekap && pocketsCount > 0 && (
                <Button variant="outline" className="mt-2 w-full rounded-xl" onClick={handleGenerateAll} disabled={generatingAll}>
                  {generatingAll ? "Membuat..." : "Buat Semua Kantong + Rekap"}
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </section>

      {/* Previous reports for selected pocket */}
      <section className="space-y-3">
        <h2 className="px-1 text-sm font-semibold">Laporan Sebelumnya {isRekap ? "— Rekap" : `— ${pocket?.name ?? ""}`}</h2>
        {list.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center text-xs text-muted-foreground">Belum ada laporan {isRekap ? "rekap" : pocket?.name}.</CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {list.map((r) => (
              <Card key={r.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{monthLabel(r.year, r.month)}</p>
                      <p className="text-xs text-muted-foreground">Saldo Akhir {formatRupiah(Number(r.closing_balance))} • {r.transaction_count} trx</p>
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
    </div>
  );
}
