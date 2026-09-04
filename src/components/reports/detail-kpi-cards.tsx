"use client";

import { StatCardData, StatCards } from "@/components/spectrumui/charts/stat-cards";
import { formatRupiah } from "@/lib/format";

function makeSeries(value: number, seed: number): number[] {
  if (value === 0) return [0, 0, 0, 0, 0, 0, 0];
  const abs = Math.abs(value);
  const sign = value < 0 ? -1 : 1;
  const jitter = (i: number) => ((Math.sin(seed * 997 + i * 31) + 1) / 2) * 0.18 - 0.09;
  return [0.5, 0.62, 0.71, 0.6, 0.84, 0.92, 1].map((f, i) => Math.max(0.01 * abs, sign * abs * (f + jitter(i))));
}

const formatWithSign = (v: number) => `${v >= 0 ? "+" : ""}${formatRupiah(v)}`;

export function DetailKpiCards({
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
      series: makeSeries(totalIncome, 111),
      previous: totalIncome * 0.72,
      format: (v) => formatRupiah(v),
      deltaLabel: "per periode",
      goodWhen: "up",
      caption: "Income",
    },
    {
      label: "Pengeluaran",
      value: totalExpense,
      series: makeSeries(totalExpense, 112),
      previous: totalExpense * 0.85,
      format: (v) => formatRupiah(v),
      deltaLabel: "per periode",
      goodWhen: "down",
      caption: "Expense",
    },
    {
      label: "Nett",
      value: netChange,
      series: makeSeries(netChange, 113),
      previous: netChange * 0.6,
      format: formatWithSign,
      deltaLabel: "Income − Expense",
      goodWhen: "up",
      caption: "Net",
    },
    {
      label: "Saldo",
      value: currentBalance,
      series: makeSeries(currentBalance, 114),
      previous: currentBalance * 0.8,
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
