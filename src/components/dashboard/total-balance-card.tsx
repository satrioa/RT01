import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRupiah } from "@/lib/format";
import { Wallet, ArrowUpRight, ArrowDownRight } from "lucide-react";

export function TotalBalanceCard({
  total,
  activeCount,
}: {
  total: number;
  activeCount: number;
}) {
  return (
    <Card className="border-0 bg-primary text-primary-foreground shadow-sm">
      <CardHeader className="pb-2">
        <CardDescription className="text-primary-foreground/70">
          Total Saldo
        </CardDescription>
        <CardTitle className="text-[28px] font-bold tracking-tight sm:text-3xl">
          {formatRupiah(total)}
        </CardTitle>
        <p className="text-xs text-primary-foreground/60">
          {activeCount} kantong aktif • saldo gabungan
        </p>
      </CardHeader>
      <CardContent className="flex gap-2 pt-1">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium">
          <ArrowUpRight className="size-3.5" /> Pemasukan
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium">
          <Wallet className="size-3.5" /> {activeCount} Kantong
        </span>
        <span className="ml-auto hidden items-center gap-1 text-xs text-primary-foreground/50 sm:inline-flex">
          <ArrowDownRight className="size-3" /> Transfer tidak hitung total
        </span>
      </CardContent>
    </Card>
  );
}

export function TotalBalanceCardSkeleton() {
  return (
    <div className="animate-pulse rounded-[20px] bg-muted p-6">
      <div className="h-4 w-24 rounded bg-muted-foreground/20" />
      <div className="mt-3 h-8 w-48 rounded bg-muted-foreground/20" />
      <div className="mt-2 h-3 w-32 rounded bg-muted-foreground/10" />
    </div>
  );
}
