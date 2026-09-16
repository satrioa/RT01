"use client";

import { useState } from "react";
import { PieChart } from "@/components/charts/pie-chart";
import { PieSlice } from "@/components/charts/pie-slice";
import { PieCenter } from "@/components/charts/pie-center";
import type { PieData } from "@/components/charts/pie-context";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

type Period = "today" | "month" | "year";

const PERIOD_LABELS: Record<Period, string> = {
  today: "Hari ini",
  month: "Bulan ini",
  year: "Tahun ini",
};

const EMPTY_MESSAGE: Record<Period, string> = {
  today: "Belum ada pengeluaran hari ini.",
  month: "Belum ada pengeluaran bulan ini.",
  year: "Belum ada pengeluaran tahun ini.",
};

const PERIOD_ORDER: Period[] = ["today", "month", "year"];

type DataByPeriod = Record<Period, { label: string; items: ExpenseCategoryItem[] }>;

interface ExpenseCategoryPieProps {
  dataByPeriod?: DataByPeriod;
  defaultPeriod?: Period;
  /** @deprecated use dataByPeriod instead */
  items?: ExpenseCategoryItem[];
  /** @deprecated use dataByPeriod instead */
  monthLabel?: string;
}

export function ExpenseCategoryPie({
  dataByPeriod: dataByPeriodProp,
  defaultPeriod = "month",
  items: legacyItems,
  monthLabel: legacyMonthLabel,
}: ExpenseCategoryPieProps) {
  // Backward compat: if dataByPeriod not provided, fallback to legacy items+monthLabel
  const dataByPeriod: DataByPeriod =
    dataByPeriodProp ??
    ({
      today: { label: legacyMonthLabel ?? "", items: [] },
      month: { label: legacyMonthLabel ?? "", items: legacyItems ?? [] },
      year: { label: legacyMonthLabel ?? "", items: [] },
    } as DataByPeriod);

  const [period, setPeriod] = useState<Period>(defaultPeriod);

  // Ensure period is valid even if defaultPeriod mismatched
  const activePeriod: Period = (PERIOD_ORDER.includes(period) ? period : "month") as Period;
  const activeEntry = dataByPeriod[activePeriod] ?? { label: "", items: [] };
  const activeItems = activeEntry.items ?? [];
  const total = activeItems.reduce((s, i) => s + i.value, 0);

  const hasData = activeItems.length > 0 && total > 0;

  const pieData: PieData[] = hasData
    ? activeItems.map((item, i) => ({
        label: item.label,
        value: item.value,
        color: SLICE_PALETTE[i % SLICE_PALETTE.length],
      }))
    : [];

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <ChartPie className="size-4 text-muted-foreground" /> Pengeluaran per kategori
          </h3>
          <Select value={activePeriod} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="h-8 w-[128px] rounded-full bg-muted border-0 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_ORDER.map((p) => (
                <SelectItem key={p} value={p}>
                  {PERIOD_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {hasData ? (
          <div className="flex flex-col items-center gap-2">
            <PieChart data={pieData} size={200} innerRadius={62} padAngle={0.03} cornerRadius={5}>
              {pieData.map((item, index) => (
                <PieSlice index={index} key={item.label} />
              ))}
              <PieCenter
                defaultLabel="Keluar"
                formatOptions={{ style: "currency", currency: "IDR", maximumFractionDigits: 0 }}
                valueClassName="max-w-full truncate px-1 text-center font-bold tabular-nums leading-none text-[clamp(0.6rem,13cqw,0.9rem)]"
                labelClassName="max-w-full truncate leading-tight text-[clamp(0.55rem,8cqw,0.65rem)]"
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
                    <span className="shrink-0 font-semibold tabular-nums">
                      {formatRupiah(item.value)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
            {EMPTY_MESSAGE[activePeriod]}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
