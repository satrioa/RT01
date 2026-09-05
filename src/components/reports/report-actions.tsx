"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";
import { generateReportAction, closeReportAction, reopenReportAction } from "@/lib/actions/monthly-reports";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw, Lock, Unlock } from "lucide-react";

export function ReportActions({
  year,
  month,
  status,
}: {
  year: number;
  month: number;
  status: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState<string | null>(null);

  async function handleGenerate(force = false) {
    setLoading("generate");
    try {
      const res = await generateReportAction(year, month, force);
      if ((res as { ok: boolean }).ok) {
        toast({ title: force ? "Laporan diregenerasi" : "Laporan dibuat" });
        router.refresh();
      } else {
        toast({ title: "Gagal", variant: "error" });
      }
    } catch (e) {
      toast({ title: "Gagal", description: e instanceof Error ? e.message : String(e), variant: "error" });
    } finally {
      setLoading(null);
    }
  }

  async function handleClose() {
    if (!confirm(`Tutup bulan ${month}/${year}? Setelah ditutup, transaksi bulan ini tidak bisa diubah tanpa buka kembali.`)) return;
    setLoading("close");
    try {
      await closeReportAction(year, month);
      toast({ title: "Bulan ditutup" });
      router.refresh();
    } catch (e) {
      toast({ title: "Gagal tutup", description: e instanceof Error ? e.message : String(e), variant: "error" });
    } finally {
      setLoading(null);
    }
  }

  async function handleReopen() {
    if (!confirm(`Buka kembali ${month}/${year}? Perubahan transaksi dapat menyebabkan laporan perlu dibuat ulang.`)) return;
    setLoading("reopen");
    try {
      await reopenReportAction(year, month);
      toast({ title: "Bulan dibuka kembali", description: "Laporan perlu diregenerasi setelah perubahan." });
      router.refresh();
    } catch (e) {
      toast({ title: "Gagal buka", description: e instanceof Error ? e.message : String(e), variant: "error" });
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === "READY" && (
        <>
          <Button variant="outline" size="sm" className="rounded-xl" onClick={handleClose} disabled={!!loading}>
            {loading === "close" ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />} Tutup Bulan
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => handleGenerate(true)} disabled={!!loading}>
            {loading === "generate" ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} Regenerasi
          </Button>
        </>
      )}
      {status === "CLOSED" && (
        <Button variant="outline" size="sm" className="rounded-xl" onClick={handleReopen} disabled={!!loading}>
          {loading === "reopen" ? <Loader2 className="size-4 animate-spin" /> : <Unlock className="size-4" />} Buka Kembali
        </Button>
      )}
      {status === "REOPENED" && (
        <Button size="sm" className="rounded-xl" onClick={() => handleGenerate(true)} disabled={!!loading}>
          {loading === "generate" ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} Regenerasi Laporan
        </Button>
      )}
      {status === "FAILED" && (
        <Button size="sm" className="rounded-xl" onClick={() => handleGenerate(true)} disabled={!!loading}>
          {loading === "generate" ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} Coba Lagi
        </Button>
      )}
    </div>
  );
}
