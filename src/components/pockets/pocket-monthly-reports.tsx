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
  const reports = await listMonthlyReports(supabase, rtId, 6).catch(() => []);
  if (reports.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center text-xs text-muted-foreground">
          Belum ada laporan bulanan untuk kantong ini.
        </CardContent>
      </Card>
    );
  }

  // For each report, fetch its pocket snapshot for this pocket
  const snapshots = await Promise.all(
    reports.map(async (r) => {
      const { data } = await supabase.from("monthly_report_pockets").select("*").eq("monthly_report_id", r.id).eq("pocket_id", pocketId).maybeSingle();
      return { report: r, pocket: data as { closing_balance: string; opening_balance: string } | null };
    })
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Calendar className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Laporan Bulanan — {pocketName}</h3>
      </div>
      {snapshots.map(({ report, pocket }) => {
        const monthLabel = new Date(report.year, report.month - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
        const statusLabel = report.status === "READY" ? "Laporan tersedia" : report.status;
        const closing = pocket ? Number(pocket.closing_balance) : Number(report.closing_balance);
        return (
          <Card key={report.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{monthLabel}</CardTitle>
                <Badge variant={report.status === "READY" ? "success" : "outline"} className="rounded-full text-xs">
                  ✓ {statusLabel}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">Saldo Akhir {formatRupiah(closing)}</p>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Link href={`/reports/${report.year}/${String(report.month).padStart(2, "0")}`} className="flex-1">
                <Button variant="outline" size="sm" className="w-full rounded-xl">
                  Lihat
                </Button>
              </Link>
              <Link href={`/api/reports/${report.year}/${String(report.month).padStart(2, "0")}/pdf`} className="flex-1">
                <Button variant="outline" size="sm" className="w-full rounded-xl">
                  <FileText className="size-3" /> PDF
                </Button>
              </Link>
              <Link href={`/api/reports/${report.year}/${String(report.month).padStart(2, "0")}/excel`} className="flex-1">
                <Button variant="outline" size="sm" className="w-full rounded-xl">
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
