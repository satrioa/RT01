import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createServiceClient } from "@/lib/supabase/service";
import { listMonthlyReports } from "@/lib/reports/monthly-report-service";
import { formatRupiah } from "@/lib/format";
import { FileText, Download, Calendar } from "lucide-react";

export async function PocketMonthlyReports({ rtId, pocketId, pocketName }: { rtId: string; pocketId: string; pocketName: string }) {
  const supabase = createServiceClient();
  // Per-kantong: filter by pocket_id; fallback to legacy if column missing handled in service
  const reports = await listMonthlyReports(supabase, rtId, { pocketId, limit: 6 }).catch(() => []);
  if (reports.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center text-xs text-muted-foreground">
          Belum ada laporan bulanan untuk kantong ini.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Calendar className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Laporan Bulanan — {pocketName}</h3>
      </div>
      {reports.map((report) => {
        const monthLabel = new Date(report.year, report.month - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
        const statusLabel = report.status === "READY" ? "Laporan tersedia" : report.status;
        const closing = Number(report.closing_balance);
        return (
          <Card key={report.id} className="overflow-hidden border-[#3a3a3a] bg-[#2b2b2b] text-white">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-white">{monthLabel}</CardTitle>
                <Badge variant={report.status === "READY" ? "success" : "outline"} className="rounded-full text-xs">
                  ✓ {statusLabel}
                </Badge>
              </div>
              <p className="text-xs text-zinc-400">Saldo Akhir {formatRupiah(closing)}</p>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Link href={`/reports/${report.year}/${String(report.month).padStart(2, "0")}?pocket=${pocketId}`} className="flex-1">
                <Button variant="outline" size="sm" className="w-full rounded-xl border-zinc-700 bg-transparent text-white hover:bg-zinc-800 hover:text-white">
                  Lihat
                </Button>
              </Link>
              <Link href={`/api/reports/${report.year}/${String(report.month).padStart(2, "0")}/pdf?pocket=${pocketId}`} className="flex-1">
                <Button variant="outline" size="sm" className="w-full rounded-xl border-zinc-700 bg-transparent text-white hover:bg-zinc-800 hover:text-white">
                  <FileText className="size-3" /> PDF
                </Button>
              </Link>
              <Link href={`/api/reports/${report.year}/${String(report.month).padStart(2, "0")}/excel?pocket=${pocketId}`} className="flex-1">
                <Button variant="outline" size="sm" className="w-full rounded-xl border-zinc-700 bg-transparent text-white hover:bg-zinc-800 hover:text-white">
                  <Download className="size-3" /> Excel
                </Button>
              </Link>
            </CardContent>
          </Card>
        );
      })}
      <p className="px-1 text-[11px] text-muted-foreground">Laporan bulanan per kantong — pilih bulan, bukan rentang tanggal.</p>
    </div>
  );
}
