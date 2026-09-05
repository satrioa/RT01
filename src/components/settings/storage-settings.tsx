"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/toaster";
import {
  exportBackupAction,
  getStorageStatsAction,
  resetRtDataAction,
  type StorageStats,
} from "@/lib/actions/storage";
import { DatabaseBackup, Download, Loader2, RefreshCw, ShieldAlert, Trash2 } from "lucide-react";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export function StorageSettings() {
  const { toast } = useToast();
  const router = useRouter();
  const [stats, setStats] = React.useState<StorageStats | null>(null);
  const [loadingStats, setLoadingStats] = React.useState(true);
  const [exporting, setExporting] = React.useState(false);
  const [lastBackup, setLastBackup] = React.useState<{ rows: number; size: string; at: string } | null>(null);
  const [confirmText, setConfirmText] = React.useState("");
  const [showReset, setShowReset] = React.useState(false);
  const [resetting, setResetting] = React.useState(false);

  const loadStats = React.useCallback(async () => {
    setLoadingStats(true);
    try {
      setStats(await getStorageStatsAction());
    } finally {
      setLoadingStats(false);
    }
  }, []);

  React.useEffect(() => {
    void loadStats();
  }, [loadStats]);

  async function handleBackup() {
    setExporting(true);
    try {
      const res = await exportBackupAction();
      if (!res.ok || !res.backup) {
        toast({ title: "Backup gagal", description: res.error ?? "Unknown error", variant: "error" });
        return;
      }
      const json = JSON.stringify(res.backup, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `rtfinance-backup-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      const rows =
        res.backup.transactions.length +
        res.backup.transfers.length +
        res.backup.monthly_reports.length +
        res.backup.pockets.length +
        res.backup.categories.length;
      setLastBackup({ rows, size: formatBytes(blob.size), at: new Date().toLocaleString("id-ID") });
      const truncated = Object.entries(res.backup.truncated)
        .filter(([, v]) => v)
        .map(([k]) => k);
      toast({
        title: "Backup diunduh",
        description:
          `${rows} baris • ${formatBytes(blob.size)}` +
          (truncated.length > 0 ? ` • sebagian terpotong (limit): ${truncated.join(", ")}` : ""),
      });
    } finally {
      setExporting(false);
    }
  }

  async function handleReset() {
    if (confirmText !== "RESET") return;
    if (!confirm("Terakhir: hapus SEMUA transaksi, transfer & laporan RT ini? Saldo kembali ke saldo awal kantong.")) return;
    setResetting(true);
    try {
      const res = await resetRtDataAction(confirmText);
      if (!res.ok) {
        toast({ title: "Reset gagal", description: res.error ?? "Unknown error", variant: "error" });
        return;
      }
      const d = res.deleted!;
      toast({
        title: "Reset selesai",
        description: `Transaksi ${d.transactions} • Transfer ${d.transfers} • Laporan ${d.reports} • File laporan ${res.storage_removed ?? 0} dihapus`,
      });
      setConfirmText("");
      setShowReset(false);
      await loadStats();
      router.refresh();
    } finally {
      setResetting(false);
    }
  }

  const statRows: { label: string; value: number }[] = stats
    ? [
        { label: "Transaksi", value: stats.transactions },
        { label: "Transfer", value: stats.transfers },
        { label: "Laporan bulanan", value: stats.monthly_reports },
        { label: "Lampiran", value: stats.attachments },
        { label: "Kantong (tetap)", value: stats.pockets },
        { label: "Kategori (tetap)", value: stats.categories },
      ]
    : [];

  return (
    <div className="space-y-3">
      {/* Stats */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <DatabaseBackup className="size-4" /> Storage RT ini
          </CardTitle>
          <CardDescription className="text-xs">Reset & backup hanya berlaku untuk RT ini, bukan RT lain.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {loadingStats || !stats ? (
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-[52px] animate-pulse rounded-xl bg-muted/40" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {statRows.map((s) => (
                <div key={s.label} className="rounded-xl border bg-card p-2 text-center">
                  <p className="text-base font-bold tabular-nums">{s.value.toLocaleString("id-ID")}</p>
                  <p className="text-[10px] leading-tight text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          )}
          <Button variant="ghost" size="sm" className="h-7 rounded-full px-3 text-xs" onClick={() => void loadStats()} disabled={loadingStats}>
            <RefreshCw className={`size-3 ${loadingStats ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </CardContent>
      </Card>

      {/* Backup */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Download className="size-4" /> Backup (JSON)
          </CardTitle>
          <CardDescription className="text-xs">
            Unduh seluruh data RT: kantong, kategori, transaksi, transfer & laporan. Simpan sebelum reset.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button onClick={() => void handleBackup()} disabled={exporting} className="w-full rounded-xl">
            {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            {exporting ? "Menyiapkan..." : "Download Backup"}
          </Button>
          {lastBackup && (
            <p className="text-center text-[11px] text-muted-foreground">
              Terakhir: {lastBackup.rows} baris • {lastBackup.size} • {lastBackup.at}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm text-destructive">
            <ShieldAlert className="size-4" /> Zona Berbahaya
          </CardTitle>
          <CardDescription className="text-xs">
            Hapus SEMUA transaksi, transfer, lampiran & laporan RT ini. Kantong & kategori tetap, saldo kembali ke saldo awal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!showReset ? (
            <Button variant="destructive" className="w-full rounded-xl" onClick={() => setShowReset(true)}>
              <Trash2 className="size-4" /> Reset Data Transaksi
            </Button>
          ) : (
            <div className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
              <Label htmlFor="reset-confirm" className="text-xs">
                Ketik <code className="rounded bg-background px-1 font-mono font-bold">RESET</code> untuk konfirmasi
              </Label>
              <Input
                id="reset-confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                placeholder="RESET"
                className="font-mono"
                autoComplete="off"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={() => {
                    setShowReset(false);
                    setConfirmText("");
                  }}
                >
                  Batal
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 rounded-xl"
                  disabled={confirmText !== "RESET" || resetting}
                  onClick={() => void handleReset()}
                >
                  {resetting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                  {resetting ? "Menghapus..." : "Hapus Semua"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />
      <p className="px-1 text-center text-[11px] text-muted-foreground">
        Backup dulu sebelum reset. Data yang dihapus tidak bisa dikembalikan.
      </p>
    </div>
  );
}
