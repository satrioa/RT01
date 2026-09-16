"use client";

import { StatCardData, StatCards } from "@/components/spectrumui/charts/stat-cards";
import { formatRupiah } from "@/lib/format";

const formatWithSign = (v: number) => `${v >= 0 ? "+" : ""}${formatRupiah(v)}`;

export function OverviewCards({
  incomeSeries,
  expenseSeries,
  netSeries,
  monthLabels,
  currentIncome,
  currentExpense,
  currentNet,
}: {
  incomeSeries: number[];
  expenseSeries: number[];
  netSeries: number[];
  monthLabels: string[];
  currentIncome: number;
  currentExpense: number;
  currentNet: number;
}) {
  const cards: StatCardData[] = [
    {
      label: "Pemasukan",
      value: currentIncome,
      series: incomeSeries,
      previous: incomeSeries[0] ?? 0,
      format: (v) => formatRupiah(v),
      deltaLabel: "per periode",
      goodWhen: "up",
      caption: "Income",
      xLabels: monthLabels,
    },
    {
      label: "Pengeluaran",
      value: currentExpense,
      series: expenseSeries,
      previous: expenseSeries[0] ?? 0,
      format: (v) => formatRupiah(v),
      deltaLabel: "per periode",
      goodWhen: "down",
      caption: "Expense",
      xLabels: monthLabels,
    },
    {
      label: "Net",
      value: currentNet,
      series: netSeries,
      previous: netSeries[0] ?? 0,
      format: formatWithSign,
      deltaLabel: "Income − Expense",
      goodWhen: "up",
      caption: "Net",
      xLabels: monthLabels,
    },
  ];

  return (
    <div className="w-full">
      <StatCards cards={cards} columns={1} />
    </div>
  );
}
