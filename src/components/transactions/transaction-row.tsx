"use client";

import Link from "next/link";
import { formatRupiah, formatDateShort } from "@/lib/format";
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TxWithMeta } from "@/lib/data/transactions";

function Icon({ type }: { type: string }) {
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
    <span className="flex size-9 items-center justify-center rounded-xl bg-muted">
      <ArrowLeftRight className="size-4" />
    </span>
  );
}

export function TransactionRow({ tx }: { tx: TxWithMeta }) {
  return (
    <Link href={`/transactions/${tx.id}`} className="flex items-center gap-3 rounded-[16px] border bg-card px-3 py-3 hover:bg-accent/40">
      <Icon type={tx.type} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-none">{tx.description || tx.category_name || (tx.type === "income" ? "Pemasukan" : "Pengeluaran")}</p>
        <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
          <span className="truncate">{tx.category_name ?? "Tanpa kategori"}</span>
          <span className="size-1 shrink-0 rounded-full bg-muted-foreground/30" />
          <span className="truncate">{tx.pocket_name ?? "—"}</span>
          <span className="size-1 shrink-0 rounded-full bg-muted-foreground/30" />
          <span>{formatDateShort(tx.transaction_date)}</span>
        </p>
      </div>
      <span className={cn("shrink-0 text-sm font-semibold tabular-nums", tx.type === "income" ? "text-success" : tx.type === "expense" ? "text-destructive" : "")}>
        {tx.type === "income" ? "+" : tx.type === "expense" ? "-" : ""}{formatRupiah(Number(tx.amount))}
      </span>
    </Link>
  );
}
