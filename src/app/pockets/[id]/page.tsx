import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { hasSupabaseEnv, DEV_RT_ID } from "@/lib/env";
import { formatRupiah, formatDateShort } from "@/lib/format";
import { getPocketSummary } from "@/lib/data/transactions";
import { BottomNav, BottomNavSpacer } from "@/components/layout/bottom-nav";
import { Card, CardContent } from "@/components/ui/card";
import { PocketPeriodFilter } from "@/components/pockets/pocket-period-filter";
import { PocketMonthlyReports } from "@/components/pockets/pocket-monthly-reports";
import { PocketDetailHero } from "@/components/pockets/pocket-detail-hero";
import { getAppearanceSettings } from "@/lib/actions/appearance";
import { ArrowLeft, Wallet, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Plus } from "lucide-react";

export const dynamic = "force-dynamic";

function resolvePeriod(period: string | undefined, from: string | undefined, to: string | undefined): { period: "today" | "this_week" | "this_month" | "custom"; from: string; to: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = fmt(now);
  if (period === "today") return { period: "today", from: today, to: today };
  if (period === "this_week") {
    const day = now.getDay(); // 0 Sun
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { period: "this_week", from: fmt(monday), to: fmt(sunday) };
  }
  if (period === "custom" && from && to) return { period: "custom", from, to };
  // default this_month
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  if (period === "custom") return { period: "custom", from: fmt(first), to: fmt(last) };
  return { period: "this_month", from: fmt(first), to: fmt(last) };
}

export default async function PocketDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const resolved = resolvePeriod(sp.period, sp.from, sp.to);

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
      </div>
    );
  }

  const supabase = createServerClient();
  const [summary, appearance] = await Promise.all([
    getPocketSummary(id),
    getAppearanceSettings().catch(() => null),
  ]);

  // Fetch filtered transactions for list (periode filter ganti Tambah Transaksi)
  const txQuery = supabase
    .from("transactions")
    .select("*, category:categories(name)")
    .eq("pocket_id", id)
    .eq("rt_id", DEV_RT_ID)
    .gte("transaction_date", resolved.from)
    .lte("transaction_date", resolved.to)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);
  const { data: txs } = await txQuery;

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
          <PocketDetailHero pocket={pocket} pocketId={id} appearance={appearance} />

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

          {/* Laporan Bulanan — monthly only, no custom date */}
          <PocketMonthlyReports rtId={DEV_RT_ID} pocketId={id} pocketName={pocket?.name ?? "Kantong"} />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="px-1 text-sm font-semibold">Transaksi</h2>
              <span className="text-xs text-muted-foreground">
                {resolved.period === "today" ? "Hari ini" : resolved.period === "this_week" ? "Minggu ini" : resolved.period === "this_month" ? "Bulan ini" : `${resolved.from} → ${resolved.to}`}
              </span>
            </div>
            <PocketPeriodFilter initialPeriod={resolved.period} initialFrom={resolved.from} initialTo={resolved.to} />
            {(!txs || txs.length === 0) ? (
              <Card className="border-dashed">
                <CardContent className="p-6 text-center text-sm text-muted-foreground">Tidak ada transaksi di periode ini.</CardContent>
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
    </div>
  );
}
