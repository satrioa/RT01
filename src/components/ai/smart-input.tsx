"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { parseSmartInputAction } from "@/lib/ai/actions";
import { createTransactionAction, createTransferAction } from "@/lib/actions/transactions";
import { useToast } from "@/components/ui/toaster";
import { formatRupiah } from "@/lib/format";
import { Sparkles, Loader2, Send, Check, X, AlertTriangle, Wallet } from "lucide-react";
import type { SmartParseResult } from "@/lib/ai/parser";

export function SmartInput() {
  const [input, setInput] = React.useState("");
  const [parsing, setParsing] = React.useState(false);
  const [result, setResult] = React.useState<SmartParseResult | null>(null);
  const [saving, setSaving] = React.useState(false);
  const { toast } = useToast();
  const router = useRouter();

  async function handleParse(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setParsing(true);
    setResult(null);
    const res = await parseSmartInputAction(input.trim());
    setParsing(false);
    setResult(res);
  }

  async function handleConfirmTransaction() {
    if (!result || result.type !== "transaction") return;
    const d = result.data;
    if (!d.pocketId) {
      toast({ title: "Kantong tidak terresolve", description: "Pilih kantong manual di form transaksi.", variant: "error" });
      return;
    }
    setSaving(true);
    const fd = new FormData();
    fd.set("type", d.type);
    fd.set("pocket_id", d.pocketId);
    if (d.categoryId) fd.set("category_id", d.categoryId);
    fd.set("amount", String(d.amount));
    fd.set("description", d.description ?? "");
    fd.set("transaction_date", d.transaction_date ?? new Date().toISOString().slice(0, 10));
    const res = await createTransactionAction(fd);
    setSaving(false);
    if (res.ok) {
      toast({ title: d.type === "income" ? "Pemasukan tersimpan" : "Pengeluaran tersimpan", description: formatRupiah(d.amount) });
      setInput("");
      setResult(null);
      router.refresh();
    } else {
      toast({ title: "Gagal menyimpan", description: res.error, variant: "error" });
    }
  }

  async function handleConfirmTransfer() {
    if (!result || result.type !== "transfer") return;
    const d = result.data;
    if (!d.fromPocketId || !d.toPocketId) {
      toast({ title: "Kantong transfer tidak terresolve", variant: "error" });
      return;
    }
    setSaving(true);
    const fd = new FormData();
    fd.set("from_pocket_id", d.fromPocketId);
    fd.set("to_pocket_id", d.toPocketId);
    fd.set("amount", String(d.amount));
    fd.set("description", d.description ?? "");
    fd.set("transaction_date", d.transaction_date ?? new Date().toISOString().slice(0, 10));
    const res = await createTransferAction(fd);
    setSaving(false);
    if (res.ok) {
      toast({ title: "Transfer tersimpan", description: `${d.from_pocket} → ${d.to_pocket} ${formatRupiah(d.amount)}` });
      setInput("");
      setResult(null);
      router.refresh();
    } else {
      toast({ title: "Gagal transfer", description: res.error, variant: "error" });
    }
  }

  function handleCancel() {
    setResult(null);
  }

  return (
    <div className="space-y-3">
      <Card className="border border-border/50 bg-card text-card-foreground shadow-sm">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold">Smart Input</p>
              <p className="text-xs text-muted-foreground">Ketik transaksi dengan bahasa alami</p>
            </div>
            <Badge variant="secondary" className="ml-auto rounded-full bg-muted text-muted-foreground border-0">
              AI
            </Badge>
          </div>

          <form onSubmit={handleParse} className="space-y-3">
            <div className="rounded-2xl bg-white p-1">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ceritakan transaksi...&#10;Contoh: Beli konsumsi kerja bakti 75 ribu dari kas"
                rows={2}
                className="min-h-[72px] resize-none border-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-0"
                aria-label="Smart input"
              />
              <div className="flex items-center justify-between px-2 pb-1 pt-1">
                <span className="text-[11px] text-muted-foreground">{input.length}/500</span>
                <Button type="submit" size="sm" disabled={parsing || !input.trim()} className="h-8 rounded-xl">
                  {parsing ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  {parsing ? "Memproses..." : "Parse"}
                </Button>
              </div>
            </div>
            <p className="text-center text-[11px] text-muted-foreground">AI tidak langsung menulis ke database — perlu konfirmasi. • “saldo kas” dijawab tanpa AI.</p>
          </form>
        </CardContent>
      </Card>

        {/* Confirmation overlay */}
        {result && (result.type === "deterministic" || result.type === "needs_confirmation" || result.type === "transaction" || result.type === "transfer" || result.type === "error") && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={handleCancel}>
            <div className="w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
              {/* Deterministic answer */}
              {result.type === "deterministic" && (
                <Card className="border-success/20 bg-success/5">
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-success/15 text-success">
                        <Wallet className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">Jawaban</p>
                        <p className="mt-1 text-sm leading-relaxed">{result.answer}</p>
                        <Button variant="ghost" size="sm" className="mt-2 h-7 rounded-xl px-3 text-xs" onClick={handleCancel}>
                          Tutup
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Needs confirmation */}
              {result.type === "needs_confirmation" && (
                <Card className="border-warning/20 bg-warning/5">
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning">
                        <AlertTriangle className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1 space-y-2">
                        <p className="text-sm font-semibold">Perlu konfirmasi</p>
                        {result.data.questions.map((q, i) => (
                          <p key={i} className="text-sm leading-relaxed">{q}</p>
                        ))}
                        {result.data.options && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {result.data.options.map((opt) => (
                              <Badge key={opt} variant="outline" className="rounded-full">{opt}</Badge>
                            ))}
                          </div>
                        )}
                        {result.data.partial && (
                          <p className="text-xs text-muted-foreground">Terdeteksi: {JSON.stringify(result.data.partial)}</p>
                        )}
                        <div className="flex gap-2 pt-1">
                          <Button variant="outline" size="sm" className="rounded-xl" onClick={handleCancel}>Tutup</Button>
                          <Button size="sm" className="rounded-xl" onClick={() => toast({ title: "Lengkapi di form", description: "Buka Tambah Transaksi untuk melengkapi kantong yang hilang." })}>Buka Form</Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Transaction confirmation */}
              {result.type === "transaction" && (
                <Card className="border">
                  <CardContent className="p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <Badge variant={result.data.type === "income" ? "success" : "destructive"} className="rounded-full">
                        {result.data.type === "income" ? "Pemasukan" : "Pengeluaran"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">conf {(result.data.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <p className="text-2xl font-bold tabular-nums">{formatRupiah(result.data.amount)}</p>
                    <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl bg-muted/40 p-3 text-sm">
                      <div><p className="text-xs text-muted-foreground">Kantong</p><p className="font-medium">{result.data.pocket}</p></div>
                      <div><p className="text-xs text-muted-foreground">Kategori</p><p className="font-medium">{result.data.category ?? "—"}</p></div>
                      <div className="col-span-2"><p className="text-xs text-muted-foreground">Deskripsi</p><p className="font-medium">{result.data.description ?? "—"}</p></div>
                      <div><p className="text-xs text-muted-foreground">Tanggal</p><p className="font-medium">{result.data.transaction_date ?? "Hari ini"}</p></div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <Button variant="outline" className="rounded-xl" onClick={handleCancel} disabled={saving}><X className="size-4" /> Batal</Button>
                      <Button className="rounded-xl" onClick={handleConfirmTransaction} disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Simpan</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Transfer confirmation */}
              {result.type === "transfer" && (
                <Card className="border">
                  <CardContent className="p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <Badge variant="outline" className="rounded-full">Pindah Kantong</Badge>
                      <span className="text-xs text-muted-foreground">conf {(result.data.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <p className="text-2xl font-bold tabular-nums">{formatRupiah(result.data.amount)}</p>
                    <p className="text-xs text-muted-foreground">Transfer tidak mengubah total saldo RT.</p>
                    <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl bg-muted/40 p-3 text-sm">
                      <div><p className="text-xs text-muted-foreground">Dari</p><p className="font-medium">{result.data.from_pocket}</p></div>
                      <div><p className="text-xs text-muted-foreground">Ke</p><p className="font-medium">{result.data.to_pocket}</p></div>
                      <div className="col-span-2"><p className="text-xs text-muted-foreground">Catatan</p><p className="font-medium">{result.data.description ?? "—"}</p></div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <Button variant="outline" className="rounded-xl" onClick={handleCancel} disabled={saving}><X className="size-4" /> Batal</Button>
                      <Button className="rounded-xl" onClick={handleConfirmTransfer} disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Simpan</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Error */}
              {result.type === "error" && (
                <Card className="border-destructive/30 bg-destructive/5">
                  <CardContent className="flex gap-3 p-4">
                    <AlertTriangle className="size-4 shrink-0 text-destructive" />
                    <p className="text-sm leading-relaxed text-destructive">{result.error}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
    </div>
  );
}
