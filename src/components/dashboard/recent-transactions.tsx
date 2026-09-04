import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatRupiah, formatDateShort } from "@/lib/format";
import { ArrowLeftRight, ArrowUpRight, ArrowDownLeft, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Transaction, Transfer } from "@/types/database";

type TxRow = Transaction & { pocket_name?: string; category_name?: string };

function TxIcon({ type }: { type: string }) {
  if (type === "income")
    return (
      <span className="flex size-9 items-center justify-center rounded-xl bg-success/15 text-success">
        <ArrowDownLeft className="size-4" />
      </span>
    );
  if (type === "expense")
    return (
      <span className="flex size-9 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
        <ArrowUpRight className="size-4" />
      </span>
    );
  return (
    <span className="flex size-9 items-center justify-center rounded-xl bg-muted text-foreground">
      <ArrowLeftRight className="size-4" />
    </span>
  );
}

function Amount({
  type,
  amount,
}: {
  type: string;
  amount: string | number;
}) {
  const n = Number(amount);
  const text =
    type === "income" ? `+${formatRupiah(n)}` : type === "expense" ? `-${formatRupiah(n)}` : formatRupiah(n);
  return (
    <span
      className={cn(
        "shrink-0 text-sm font-semibold tabular-nums",
        type === "income" && "text-success",
        type === "expense" && "text-destructive",
        type === "transfer" && "text-foreground"
      )}
    >
      {text}
    </span>
  );
}

export function RecentTransactions({
  transactions,
  transfers,
}: {
  transactions: TxRow[];
  transfers: Transfer[];
}) {
  // Merge latest 5: prioritize transactions then transfers interleaved by date
  const hasData = transactions.length > 0 || transfers.length > 0;

  if (!hasData) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center">
          <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-muted">
            <Receipt className="size-5 text-muted-foreground" />
          </div>
          <p className="mt-3 text-sm font-semibold">Belum ada transaksi</p>
          <p className="mx-auto mt-1 max-w-[32ch] text-xs leading-relaxed text-muted-foreground">
            Transaksi pemasukan, pengeluaran, dan pindah kantong akan muncul di sini. Mulai dengan Tambah Pemasukan.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Income/expense */}
      {transactions.map((t) => (
        <Link
          key={t.id}
          href={`/transactions/${t.id}`}
          className="flex items-center gap-3 rounded-[16px] border bg-card px-3 py-3 transition-colors hover:bg-accent/40"
        >
          <TxIcon type={t.type} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-none">
              {t.description || t.category_name || (t.type === "income" ? "Pemasukan" : "Pengeluaran")}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="truncate">{t.category_name ?? "Tanpa kategori"}</span>
              <span className="size-1 rounded-full bg-muted-foreground/30" />
              <span>{t.pocket_name ?? "—"}</span>
              <span className="size-1 rounded-full bg-muted-foreground/30" />
              <span>{formatDateShort(t.transaction_date)}</span>
            </p>
          </div>
          <Amount type={t.type} amount={t.amount} />
        </Link>
      ))}

      {transfers.length > 0 && (
        <>
          {transactions.length > 0 && <Separator className="my-1" />}
          {transfers.slice(0, 2).map((tr) => (
            <div
              key={tr.id}
              className="flex items-center gap-3 rounded-[16px] border bg-card px-3 py-3"
            >
              <TxIcon type="transfer" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium leading-none">
                  {tr.description || "Pindah kantong"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDateShort(tr.transaction_date)} • Transfer
                </p>
              </div>
              <Amount type="transfer" amount={tr.amount} />
            </div>
          ))}
        </>
      )}

      <Link
        href="/transactions"
        className="flex h-10 w-full items-center justify-center rounded-xl border bg-card text-sm font-medium hover:bg-accent"
      >
        Lihat semua
      </Link>
    </div>
  );
}

export function RecentTransactionsSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex animate-pulse items-center gap-3 rounded-[16px] border bg-card px-3 py-3">
          <div className="size-9 rounded-xl bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 rounded bg-muted" />
            <div className="h-3 w-20 rounded bg-muted" />
          </div>
          <div className="h-4 w-20 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
