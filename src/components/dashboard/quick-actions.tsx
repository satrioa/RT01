import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from "lucide-react";

export function QuickActions() {
  return (
    <div className="grid grid-cols-3 gap-3">
      <Link
        href="/transactions/new?type=income"
        className="flex flex-col items-center gap-2 rounded-[20px] border bg-card px-3 py-4 text-center shadow-none transition-colors hover:bg-accent/50"
      >
        <span className="flex size-10 items-center justify-center rounded-full bg-success/15 text-success">
          <ArrowDownLeft className="size-5" />
        </span>
        <span className="text-xs font-semibold leading-tight">Tambah Pemasukan</span>
      </Link>

      <Link
        href="/transactions/new?type=expense"
        className="flex flex-col items-center gap-2 rounded-[20px] border bg-card px-3 py-4 text-center shadow-none transition-colors hover:bg-accent/50"
      >
        <span className="flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <ArrowUpRight className="size-5" />
        </span>
        <span className="text-xs font-semibold leading-tight">Tambah Pengeluaran</span>
      </Link>

      <Link
        href="/transactions/new?type=transfer"
        className="flex flex-col items-center gap-2 rounded-[20px] border bg-card px-3 py-4 text-center shadow-none transition-colors hover:bg-accent/50"
      >
        <span className="flex size-10 items-center justify-center rounded-full bg-muted text-foreground">
          <ArrowLeftRight className="size-5" />
        </span>
        <span className="text-xs font-semibold leading-tight">Pindah Kantong</span>
      </Link>
    </div>
  );
}
