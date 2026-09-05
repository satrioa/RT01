"use client";

import * as React from "react";
import { Gauge } from "@/components/charts/gauge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/format";

type Category = "pemasukan" | "pengeluaran";

export function CashFlowGauge({
  totalIncome,
  totalExpense,
}: {
  totalIncome: number;
  totalExpense: number;
}) {
  const [category, setCategory] = React.useState<Category>("pemasukan");

  const totalCashFlow = totalIncome + totalExpense;
  const pctPemasukan = totalCashFlow > 0 ? Math.round((totalIncome / totalCashFlow) * 100) : 0;
  const pctPengeluaran = totalCashFlow > 0 ? Math.round((totalExpense / totalCashFlow) * 100) : 0;

  const isPemasukan = category === "pemasukan";
  const value = isPemasukan ? pctPemasukan : pctPengeluaran;
  const amount = isPemasukan ? totalIncome : totalExpense;
  const label = isPemasukan ? "Pemasukan" : "Pengeluaran";

  return (
    <div className="space-y-3">
      <Gauge
        value={value}
        defaultLabel={label}
        centerValue={amount}
        formatOptions={{ style: "currency", currency: "IDR", maximumFractionDigits: 0 }}
      />
      <div className="flex justify-center gap-2">
        <Button
          size="sm"
          variant={isPemasukan ? "default" : "outline"}
          className={cn("rounded-full px-4 text-xs", isPemasukan && "bg-success text-success-foreground hover:bg-success/90")}
          onClick={() => setCategory("pemasukan")}
        >
          Pemasukan {pctPemasukan}%
        </Button>
        <Button
          size="sm"
          variant={!isPemasukan ? "default" : "outline"}
          className={cn("rounded-full px-4 text-xs", !isPemasukan && "bg-destructive text-destructive-foreground hover:bg-destructive/90")}
          onClick={() => setCategory("pengeluaran")}
        >
          Pengeluaran {pctPengeluaran}%
        </Button>
      </div>
    </div>
  );
}