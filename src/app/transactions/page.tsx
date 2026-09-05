import Link from "next/link";
import { BottomNavSpacer } from "@/components/layout/bottom-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TransactionFilters } from "@/components/transactions/filters";
import { TransactionGroupedList } from "@/components/transactions/transaction-grouped-list";
import { getTransactionsFiltered, getPocketsAndCategories } from "@/lib/data/transactions";
import { Plus, Receipt } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ pocket?: string; type?: string; category?: string; from?: string; to?: string; q?: string }>;
}) {
  const sp = await searchParams;

  const filters = {
    pocket: sp.pocket || undefined,
    type: (sp.type === "income" || sp.type === "expense" ? sp.type : undefined) as "income" | "expense" | undefined,
    category: sp.category || undefined,
    from: sp.from || undefined,
    to: sp.to || undefined,
    q: sp.q || undefined,
  };

  const [{ data: txs, error }, { pockets, categories }] = await Promise.all([
    getTransactionsFiltered(filters),
    getPocketsAndCategories(),
  ]);

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-background">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-card px-5 py-4">
          <div>
            <h1 className="text-sm font-semibold">Transaksi</h1>
            <p className="text-xs text-muted-foreground">Pemasukan • Pengeluaran • Transfer</p>
          </div>
          <Link href="/transactions/new" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground">
            <Plus className="size-4" /> Tambah
          </Link>
        </header>

        <main className="flex flex-1 flex-col gap-4 p-5 pb-6">
          <TransactionFilters pockets={pockets} categories={categories} current={filters} />

          {error && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-4 text-xs text-destructive">{error}</CardContent>
            </Card>
          )}

          {txs.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center">
                <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-muted">
                  <Receipt className="size-5 text-muted-foreground" />
                </div>
                <p className="mt-3 text-sm font-semibold">Tidak ada transaksi</p>
                <p className="mx-auto mt-1 max-w-[30ch] text-xs leading-relaxed text-muted-foreground">
                  Coba ubah filter atau tambah transaksi baru.
                </p>
                <Link href="/transactions/new" className="mt-4 inline-flex">
                  <Button size="sm" className="rounded-xl">Tambah Transaksi</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <TransactionGroupedList txs={txs} />
          )}
        </main>

        <BottomNavSpacer />
      </div>
    </div>
  );
}
