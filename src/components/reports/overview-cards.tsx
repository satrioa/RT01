"use client";

import { StatCardData, StatCards } from "@/components/spectrumui/charts/stat-cards";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

const formatWithSign = (v: number) => `${v >= 0 ? "+" : ""}${formatRupiah(v)}`;

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
  const cards: StatCardData[] = [
    {
      label: "Pemasukan",
      value: totalIncome,
      format: (v) => formatRupiah(v),
      deltaLabel: "per periode",
      goodWhen: "up",
      caption: "Income",
    },
    {
      label: "Pengeluaran",
      value: totalExpense,
      format: (v) => formatRupiah(v),
      deltaLabel: "per periode",
      goodWhen: "down",
      caption: "Expense",
    },
    {
      label: "Net",
      value: netChange,
      format: formatWithSign,
      deltaLabel: "Income − Expense",
      goodWhen: "up",
      caption: "Net",
    },
    {
      label: "Saldo",
      value: currentBalance,
      format: (v) => formatRupiah(v),
      deltaLabel: "derivasi ledger",
      goodWhen: "up",
      caption: "Transfer 0",
    },
  ];

  return (
    <div className="w-full">
      <StatCards cards={cards} columns={2} />
    </div>
  );
}
