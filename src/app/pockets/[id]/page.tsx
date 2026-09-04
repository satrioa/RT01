import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { hasSupabaseEnv, DEV_RT_ID } from "@/lib/env";
import { formatRupiah, formatDateShort } from "@/lib/format";
import { getPocketSummary } from "@/lib/data/transactions";
import { BottomNav, BottomNavSpacer } from "@/components/layout/bottom-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Wallet, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PocketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!hasSupabaseEnv()) {
    return (
      <div className="min-h-dvh bg-background">
        <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-background">
          <header className="flex items-center gap-3 border-b bg-card px-5 py-4">
            <Link href="/" className="flex size-9 items-center justify-center rounded-full border bg-card">
              <ArrowLeft className="size-4" />
            </Link>
            <h1 className="text-sm font-semibold">Detail kantong</h1>
          </header>
          <main className="p-5">
            <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Supabase belum dikonfigurasi.</CardContent></Card>
          </main>
          <BottomNavSpacer />
        </div>
        <BottomNav />
      </div>
    );
  }

  const supabase = createServerClient();
  const summary = await getPocketSummary(id);

  // Also fetch recent transactions for list
  const { data: txs } = await supabase
    .from("transactions")
    .select("*, category:categories(name)")
    .eq("pocket_id", id)
    .eq("rt_id", DEV_RT_ID)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(20);

  const pocket = summary.pocket;

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-background">
        <header className="flex items-center gap-3 border-b bg-card px-5 py-4">
          <Link href="/" className="flex size-9 items-center justify-center rounded-full border bg-card">
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold">{pocket?.name ?? "Kantong"}</h1>
            <p className="text-xs text-muted-foreground">Detail saldo & ringkasan</p>
          </div>
          <Link href={`/transactions/new?pocket=${id}`} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground">
            <Plus className="size-4" /> Tambah
          </Link>
        </header>

        <main className="flex flex-1 flex-col gap-6 p-5 pb-6">
          <Card className="border-0 bg-primary text-primary-foreground">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Wallet className="size-5" /> {pocket?.name ?? id.slice(0, 8)}
              </CardTitle>
              <p className="text-xs text-primary-foreground/70">{pocket?.description ?? "Kantong RT"}</p>
            </CardHeader>
            <CardContent>
              <p className="text-[11px] tracking-widest text-primary-foreground/60">SALDO SAAT INI</p>
              <p className="text-3xl font-bold tracking-tight">{formatRupiah(Number(pocket?.balance ?? 0))}</p>
              <p className="mt-1 text-xs text-primary-foreground/60">Saldo awal: {formatRupiah(Number((pocket as unknown as { opening_balance?: string | number })?.opening_balance ?? 0))}</p>
              <Link href="/transactions/new?type=transfer" className="mt-3 inline-flex text-xs font-medium text-primary-foreground/80 underline">Pindah Kantong →</Link>
            </CardContent>
          </Card>

          {/* Summary grid */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="col-span-2 border-primary/20 bg-primary/5">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Wallet className="size-3.5" /> Saldo Awal
                </div>
                <p className="text-sm font-bold">{formatRupiah(Number((pocket as unknown as { opening_balance?: string | number })?.opening_balance ?? 0))}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ArrowDownLeft className="size-3.5 text-success" /> Pemasukan
                </div>
                <p className="mt-1 text-sm font-semibold text-success">+{formatRupiah(summary.income)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ArrowUpRight className="size-3.5 text-destructive" /> Pengeluaran
                </div>
                <p className="mt-1 text-sm font-semibold text-destructive">-{formatRupiah(summary.expense)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ArrowLeftRight className="size-3.5" /> Masuk (transfer)
                </div>
                <p className="mt-1 text-sm font-semibold">+{formatRupiah(summary.transferIn)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ArrowLeftRight className="size-3.5" /> Keluar (transfer)
                </div>
                <p className="mt-1 text-sm font-semibold">-{formatRupiah(summary.transferOut)}</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/transactions?pocket=${id}`} className="text-xs font-medium text-primary hover:underline">
              Lihat semua transaksi kantong →
            </Link>
            <span className="ml-auto text-xs text-muted-foreground">Transfer tidak hitung total RT</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="px-1 text-sm font-semibold">Transaksi terbaru</h2>
              <Link href={`/transactions/new?pocket=${id}`}>
                <Button size="sm" className="h-8 rounded-xl">Tambah Transaksi</Button>
              </Link>
            </div>
            {(!txs || txs.length === 0) ? (
              <Card className="border-dashed">
                <CardContent className="p-6 text-center text-sm text-muted-foreground">Belum ada transaksi di kantong ini.</CardContent>
              </Card>
            ) : (
              (txs as unknown as { id: string; amount: string; type: string; description: string | null; transaction_date: string; category: { name: string } | null }[]).map((t) => (
                <Link key={t.id} href={`/transactions/${t.id}`} className="flex items-center justify-between rounded-2xl border bg-card px-4 py-3 hover:bg-accent/40">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{t.description || t.category?.name || t.type}</p>
                    <p className="text-xs text-muted-foreground">{formatDateShort(t.transaction_date)}</p>
                  </div>
                  <span className={`text-sm font-semibold tabular-nums ${t.type === "income" ? "text-success" : "text-destructive"}`}>
                    {t.type === "income" ? "+" : "-"}
                    {formatRupiah(Number(t.amount))}
                  </span>
                </Link>
              ))
            )}
          </div>
        </main>

        <BottomNavSpacer />
      </div>
      <BottomNav />
    </div>
  );
}
