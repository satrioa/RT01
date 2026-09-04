import Link from "next/link";
import { BottomNav, BottomNavSpacer } from "@/components/layout/bottom-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { OverviewCards } from "@/components/reports/overview-cards";
import { MonthlyChart } from "@/components/reports/monthly-chart";
import { CategoryBreakdown } from "@/components/reports/category-breakdown";
import { PocketBreakdown } from "@/components/reports/pocket-breakdown";
import { TransactionRow } from "@/components/transactions/transaction-row";
import { ReportsFilter } from "@/components/reports/reports-filter";
import { getReportsData, type DateRange } from "@/lib/data/reports";
import { AlertTriangle, BarChart3 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const range = (["this_month", "last_month", "this_year", "custom"].includes(sp.range ?? "") ? (sp.range as DateRange) : "this_month") as DateRange;

  const data = await getReportsData({ range, customFrom: sp.from, customTo: sp.to });

  const hasTx = data.transactions.length > 0;

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-background">
        <header className="sticky top-0 z-10 border-b bg-card px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <BarChart3 className="size-4" />
            </span>
            <div>
              <h1 className="text-sm font-semibold">Laporan</h1>
              <p className="text-xs text-muted-foreground">Rekap derivasi ledger • {data.rangeLabel}</p>
            </div>
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-6 p-5 pb-6">
          <ReportsFilter initialRange={range} initialFrom={data.from} initialTo={data.to} />

          {data.error && (
            <Card className="border-warning/30 bg-warning/5">
              <CardContent className="flex gap-3 p-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning">
                  <AlertTriangle className="size-4" />
                </span>
                <p className="text-xs leading-relaxed text-muted-foreground">{data.error}</p>
              </CardContent>
            </Card>
          )}

          {/* Overview */}
          <section className="space-y-3">
            <h2 className="px-1 text-sm font-semibold">Ringkasan</h2>
            <OverviewCards
              totalIncome={data.totalIncome}
              totalExpense={data.totalExpense}
              netChange={data.netChange}
              currentBalance={data.currentBalance}
            />
          </section>

          {/* Monthly overview — lightweight chart */}
          <section className="space-y-3">
            <h2 className="px-1 text-sm font-semibold">Perbandingan</h2>
            <Card>
              <CardContent className="p-4">
                <MonthlyChart totalIncome={data.totalIncome} totalExpense={data.totalExpense} label={data.rangeLabel} />
              </CardContent>
            </Card>
          </section>

          {/* Expense by category */}
          <CategoryBreakdown
            title="Pengeluaran per kategori"
            items={data.expenseByCategory}
            emptyText="Belum ada pengeluaran di periode ini."
            accent="destructive"
          />

          {/* Expandable: Income by category */}
          <details className="group rounded-[20px] border bg-card" open={data.incomeByCategory.length > 0 && data.expenseByCategory.length === 0}>
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3">
              <span className="text-sm font-semibold">Pemasukan per kategori</span>
              <span className="text-xs text-muted-foreground group-open:hidden">Buka</span>
              <span className="hidden text-xs text-muted-foreground group-open:inline">Tutup</span>
            </summary>
            <div className="px-4 pb-4">
              <Separator className="mb-4" />
              <CategoryBreakdown
                title=""
                items={data.incomeByCategory}
                emptyText="Belum ada pemasukan di periode ini."
                accent="success"
              />
            </div>
          </details>

          {/* Pocket breakdown — current balances (not period filtered) */}
          <PocketBreakdown pockets={data.pocketBalances} />

          {/* Transaction history — expandable, inspect underlying tx */}
          <details className="group rounded-[20px] border bg-card" open={hasTx}>
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3">
              <span className="text-sm font-semibold">Riwayat transaksi</span>
              <span className="text-xs text-muted-foreground">{data.transactions.length} transaksi</span>
            </summary>
            <div className="space-y-3 px-4 pb-4">
              <Separator />
              <p className="text-xs text-muted-foreground">Transaksi yang membentuk ringkasan {data.rangeLabel}.</p>
              {hasTx ? (
                <div className="space-y-2">
                  {data.transactions.map((t) => (
                    <TransactionRow key={t.id} tx={t} />
                  ))}
                  <Link href={`/transactions?from=${data.from}&to=${data.to}`} className="flex h-9 items-center justify-center rounded-xl border bg-background text-sm font-medium">
                    Lihat dengan filter penuh →
                  </Link>
                </div>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="p-4 text-center text-xs text-muted-foreground">Tidak ada transaksi di periode ini.</CardContent>
                </Card>
              )}
            </div>
          </details>

          <p className="pb-2 text-center text-[11px] tracking-wide text-muted-foreground">
            Laporan derivasi ledger • Transfer antar kantong tidak mempengaruhi ringkasan.
          </p>
        </main>

        <BottomNavSpacer />
      </div>
      <BottomNav />
    </div>
  );
}
