import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

export function MonthlyChart({
  totalIncome,
  totalExpense,
  label,
}: {
  totalIncome: number;
  totalExpense: number;
  label: string;
}) {
  const max = Math.max(totalIncome, totalExpense, 1);
  const incomePct = Math.round((totalIncome / max) * 100);
  const expensePct = Math.round((totalExpense / max) * 100);
  const total = totalIncome + totalExpense;
  const incomeShare = total ? Math.round((totalIncome / total) * 100) : 50;

  return (
    <div className="space-y-3">
      {/* Stacked share bar — readable at 375px */}
      <div className="flex h-3 w-full overflow-hidden rounded-full border">
        <div className="bg-success transition-all" style={{ width: `${incomeShare}%` }} aria-label="Income share" />
        <div className="bg-destructive transition-all" style={{ width: `${100 - incomeShare}%` }} aria-label="Expense share" />
      </div>
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>{incomeShare}% pemasukan</span>
        <span>{100 - incomeShare}% pengeluaran</span>
      </div>

      {/* Two-bar comparison — lightweight, no chart lib */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="rounded-2xl border bg-card p-3">
          <p className="text-xs text-muted-foreground">Pemasukan</p>
          <p className="mt-1 text-sm font-bold tabular-nums text-success">{formatRupiah(totalIncome)}</p>
          <div className="mt-2 h-2 rounded-full bg-muted">
            <div className={cn("h-2 rounded-full bg-success transition-all")} style={{ width: `${incomePct}%` }} />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
        </div>
        <div className="rounded-2xl border bg-card p-3">
          <p className="text-xs text-muted-foreground">Pengeluaran</p>
          <p className="mt-1 text-sm font-bold tabular-nums text-destructive">{formatRupiah(totalExpense)}</p>
          <div className="mt-2 h-2 rounded-full bg-muted">
            <div className={cn("h-2 rounded-full bg-destructive transition-all")} style={{ width: `${expensePct}%` }} />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
        </div>
      </div>

      <p className="text-center text-[11px] text-muted-foreground">
        Transfer antar kantong tidak dihitung sebagai pemasukan/pengeluaran.
      </p>
    </div>
  );
}
