"use client";

import { StatCardData, StatCards } from "@/components/spectrumui/charts/stat-cards";

function makeSeries(value: number, seed: number): number[] {
  if (value === 0) return [0, 0, 0, 0, 0, 0, 0];
  const abs = Math.abs(value);
  const sign = value < 0 ? -1 : 1;
  const jitter = (i: number) => ((Math.sin(seed * 997 + i * 31) + 1) / 2) * 0.18 - 0.09;
  return [0.5, 0.62, 0.71, 0.6, 0.84, 0.92, 1].map((f, i) => Math.max(0.01 * abs, sign * abs * (f + jitter(i))));
}

export function DetailKpiCards({
  transactionCount,
  avgAmount,
  pocketCount,
  categoryCount,
  totalIncome,
  totalExpense,
}: {
  transactionCount: number;
  avgAmount: number;
  pocketCount: number;
  categoryCount: number;
  totalIncome: number;
  totalExpense: number;
}) {
  const expenseRatio = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0;
  const clampedProgress = Math.max(0, Math.min(1, totalIncome > 0 ? totalExpense / Math.max(totalIncome, 1) : 0));

  const cards: StatCardData[] = [
    {
      label: "Transaksi",
      value: transactionCount,
      series: makeSeries(transactionCount, 101),
      previous: Math.max(0, transactionCount - 2),
      format: (v) => `${Math.round(v)} trx`,
      goodWhen: "up",
      deltaLabel: "vs awal periode",
      caption: `${transactionCount} transaksi`,
    },
    {
      label: "Rata-rata",
      value: avgAmount,
      series: makeSeries(avgAmount, 102),
      previous: avgAmount * 0.78,
      format: (v) => `Rp ${Math.round(v).toLocaleString("id-ID")}`,
      goodWhen: "up",
      deltaLabel: "per transaksi",
      caption: "Avg amount",
    },
    {
      label: "Kantong Aktif",
      value: pocketCount,
      series: makeSeries(pocketCount, 103),
      previous: Math.max(1, pocketCount - 1),
      format: (v) => `${Math.round(v)} kantong`,
      goodWhen: "up",
      deltaLabel: pocketCount > 1 ? "multi kantong" : "single",
      caption: `${pocketCount} aktif`,
    },
    {
      label: "Efisiensi",
      value: expenseRatio,
      progress: clampedProgress,
      format: (v) => `${v.toFixed(1)}%`,
      caption: `Pengeluaran ${clampedProgress < 0.7 ? "terkendali" : "tinggi"} • ${categoryCount} kategori`,
    },
  ];

  return (
    <div className="w-full">
      <StatCards cards={cards} columns={2} />
    </div>
  );
}
