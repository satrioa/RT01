"use client";

import { PieChart } from "@/components/charts/pie-chart";
import { PieSlice } from "@/components/charts/pie-slice";
import { PieCenter } from "@/components/charts/pie-center";
import type { PieData } from "@/components/charts/pie-context";
import { Card, CardContent } from "@/components/ui/card";
import { formatRupiah } from "@/lib/format";
import { ChartPie } from "lucide-react";

const SLICE_PALETTE = [
  "#0ea5e9",
  "#f59e0b",
  "#10b981",
  "#8b5cf6",
  "#ec4899",
  "#e11d48",
  "#6366f1",
  "#14b8a6",
  "#f97316",
  "#84cc16",
];

export interface ExpenseCategoryItem {
  label: string;
  value: number;
}

export function ExpenseCategoryPie({
  items,
  monthLabel,
}: {
  items: ExpenseCategoryItem[];
  monthLabel: string;
}) {
  const total = items.reduce((s, i) => s + i.value, 0);

  if (items.length === 0 || total <= 0) {
    return (
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold">
            <ChartPie className="size-4 text-muted-foreground" /> Pengeluaran per kategori
          </h2>
          <span className="text-xs text-muted-foreground">{monthLabel}</span>
        </div>
        <Card className="border-dashed">
          <CardContent className="p-6 text-center text-xs text-muted-foreground">
            Belum ada pengeluaran bulan ini.
          </CardContent>
        </Card>
      </section>
    );
  }

  const pieData: PieData[] = items.map((item, i) => ({
    label: item.label,
    value: item.value,
    color: SLICE_PALETTE[i % SLICE_PALETTE.length],
  }));

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <ChartPie className="size-4 text-muted-foreground" /> Pengeluaran per kategori
        </h2>
        <span className="text-xs text-muted-foreground">{monthLabel}</span>
      </div>
      <Card className="overflow-hidden">
        <CardContent className="flex flex-col items-center gap-2 p-5">
          <PieChart data={pieData} size={200} innerRadius={62} padAngle={0.03} cornerRadius={5}>
            {pieData.map((item, index) => (
              <PieSlice index={index} key={item.label} />
            ))}
            <PieCenter
              defaultLabel="Keluar"
              formatOptions={{ style: "currency", currency: "IDR", maximumFractionDigits: 0 }}
            />
          </PieChart>
          <ul className="mt-1 w-full space-y-1.5">
            {pieData.map((item) => {
              const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
              return (
                <li key={item.label} className="flex items-center gap-2 text-xs">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: item.color }}
                  />
                  <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
                  <span className="shrink-0 text-muted-foreground">{pct}%</span>
                  <span className="shrink-0 font-semibold tabular-nums">{formatRupiah(item.value)}</span>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}
