"use client";

import { StatCardData, StatCards } from "@/components/spectrumui/charts/stat-cards";
import { formatRupiah } from "@/lib/format";

const formatWithSign = (v: number) => `${v >= 0 ? "+" : ""}${formatRupiah(v)}`;

function makeSeries(value: number, seed: number): number[] {
  if (value === 0) return [0, 0, 0, 0, 0, 0, 0];
  const abs = Math.abs(value);
  const sign = value < 0 ? -1 : 1;
  const jitter = (i: number) => ((Math.sin(seed * 997 + i * 31) + 1) / 2) * 0.18 - 0.09;
  return [0.42, 0.55, 0.68, 0.58, 0.82, 0.91, 1].map((f, i) => Math.max(0.01 * abs, sign * abs * (f + jitter(i))));
}

export function OverviewCards({
  totalIncome,
  totalExpense,
  netChange,
}: {
  totalIncome: number;
  totalExpense: number;
  netChange: number;
}) {
  const cards: StatCardData[] = [
    {
      label: "Pemasukan",
      value: totalIncome,
      series: makeSeries(totalIncome, 11),
      previous: totalIncome * 0.72,
      format: (v) => formatRupiah(v),
      deltaLabel: "per periode",
      goodWhen: "up",
      caption: "Income",
    },
    {
      label: "Pengeluaran",
      value: totalExpense,
      series: makeSeries(totalExpense, 23),
      previous: totalExpense * 0.85,
      format: (v) => formatRupiah(v),
      deltaLabel: "per periode",
      goodWhen: "down",
      caption: "Expense",
    },
    {
      label: "Net",
      value: netChange,
      series: makeSeries(netChange, 37),
      previous: netChange * 0.6,
      format: formatWithSign,
      deltaLabel: "Income − Expense",
      goodWhen: "up",
      caption: "Net",
    },
  ];

  return (
    <div className="w-full">
      <StatCards cards={cards} columns={1} />
    </div>
  );
}
