import { Card, CardContent } from "@/components/ui/card";
import { formatRupiah } from "@/lib/format";
import { ArrowDownLeft, ArrowUpRight, Wallet, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function OverviewCards({
  totalIncome,
  totalExpense,
  netChange,
  currentBalance,
}: {
  totalIncome: number;
  totalExpense: number;
  netChange: number;
  currentBalance: number;
}) {
  const netPositive = netChange >= 0;

  return (
    <div className="grid grid-cols-2 gap-3">
      <Card className="border-0 bg-success text-success-foreground">
        <CardContent className="p-4">
          <div className="flex items-center gap-1.5 text-xs opacity-80">
            <ArrowDownLeft className="size-3.5" /> Pemasukan
          </div>
          <p className="mt-1 text-sm font-bold tabular-nums">{formatRupiah(totalIncome)}</p>
          <p className="text-[11px] opacity-70">Total income</p>
        </CardContent>
      </Card>

      <Card className="border-0 bg-destructive text-destructive-foreground">
        <CardContent className="p-4">
          <div className="flex items-center gap-1.5 text-xs opacity-80">
            <ArrowUpRight className="size-3.5" /> Pengeluaran
          </div>
          <p className="mt-1 text-sm font-bold tabular-nums">{formatRupiah(totalExpense)}</p>
          <p className="text-[11px] opacity-70">Total expense</p>
        </CardContent>
      </Card>

      <Card className={cn("border", netPositive ? "bg-card" : "bg-warning/10 border-warning/20")}>
        <CardContent className="p-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingUp className={cn("size-3.5", netPositive ? "text-success" : "text-warning")} /> Net
          </div>
          <p className={cn("mt-1 text-sm font-bold tabular-nums", netPositive ? "text-success" : "text-warning")}>
            {netChange >= 0 ? "+" : ""}
            {formatRupiah(netChange)}
          </p>
          <p className="text-[11px] text-muted-foreground">Income − Expense</p>
        </CardContent>
      </Card>

      <Card className="border-0 bg-primary text-primary-foreground">
        <CardContent className="p-4">
          <div className="flex items-center gap-1.5 text-xs opacity-70">
            <Wallet className="size-3.5" /> Saldo saat ini
          </div>
          <p className="mt-1 text-sm font-bold tabular-nums">{formatRupiah(currentBalance)}</p>
          <p className="text-[11px] opacity-60">Derivasi ledger (transfer 0)</p>
        </CardContent>
      </Card>
    </div>
  );
}
