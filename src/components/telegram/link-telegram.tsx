"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Loader2, Send } from "lucide-react";
import { useToast } from "@/components/ui/toaster";

export function LinkTelegramCard() {
  const [code, setCode] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const { toast } = useToast();

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch("/api/telegram/link", { method: "POST" });
      const json = (await res.json()) as { ok: boolean; code?: string; error?: string };
      if (json.ok && json.code) {
        setCode(json.code);
        toast({ title: "Kode dibuat", description: `Kode: ${json.code} — berlaku 15 menit` });
      } else {
        toast({ title: "Gagal", description: json.error ?? "Gagal buat kode", variant: "error" });
      }
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Gagal", variant: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!code) return;
    await navigator.clipboard.writeText(`/link ${code}`).catch(() => {});
    toast({ title: "Disalin", description: `/link ${code} — paste di Telegram` });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Send className="size-4" /> Telegram Bot
        </CardTitle>
        <p className="text-xs text-muted-foreground">Hubungkan akun Telegram untuk catat transaksi tanpa buka web.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-xl bg-muted/40 p-3 text-xs leading-relaxed">
          <p className="font-medium">Cara hubungkan:</p>
          <ol className="mt-1 list-decimal space-y-1 pl-4">
            <li>Generate kode di bawah</li>
            <li>Buka Telegram, cari bot Anda</li>
            <li>Kirim: <code className="rounded bg-background px-1.5 py-0.5">/link KODE</code></li>
            <li>Kirim transaksi: “Beli konsumsi 75 ribu dari Kas”</li>
          </ol>
        </div>

        {code ? (
          <div className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2">
            <Input readOnly value={code} className="font-mono font-bold tracking-widest" aria-label="Kode link" />
            <Button size="sm" variant="outline" className="shrink-0 rounded-xl" onClick={handleCopy}>
              <Copy className="size-4" /> Salin
            </Button>
          </div>
        ) : (
          <p className="text-center text-xs text-muted-foreground">Belum ada kode. Generate untuk mulai.</p>
        )}

        <Button onClick={handleGenerate} disabled={loading} className="w-full rounded-xl">
          {loading ? <Loader2 className="size-4 animate-spin" /> : null}
          Generate Kode Linking (15 menit)
        </Button>

        <div className="rounded-xl border border-dashed p-3 text-xs leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground">Keamanan:</p>
          <p>Hanya akun Telegram terhubung yang bisa tulis data RT. Kode kadaluarsa otomatis &amp; sekali pakai.</p>
        </div>

        <details className="rounded-xl border bg-card p-3">
          <summary className="cursor-pointer text-sm font-medium">Perintah bot</summary>
          <div className="mt-2 space-y-1 text-xs leading-relaxed">
            <p><code>/start</code> — sapaan</p>
            <p><code>/help</code> — bantuan</p>
            <p><code>/saldo</code> / <code>/saldo kas</code> — cek saldo (tanpa AI)</p>
            <p><code>/transaksi</code> — 5 terbaru</p>
            <p><code>/laporan</code> — ringkasan bulan ini</p>
            <p><code>/unlink</code> — putuskan</p>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
