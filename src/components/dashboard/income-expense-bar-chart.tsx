"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRupiah } from "@/lib/format";

type ChartDatum = {
  month: string;
  income: number;
  expense: number;
};

type PocketOption = { id: string; name: string };

export function IncomeExpenseBarChart({
  data,
  pockets,
}: {
  data: (ChartDatum & { pocketId: string | null })[];
  pockets: PocketOption[];
}) {
  const [pocketId, setPocketId] = React.useState<string | null>(null);
  const visibleData = data.filter((item) => item.pocketId === pocketId);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">Pemasukan vs Pengeluaran</CardTitle>
          <select
            value={pocketId ?? "all"}
            onChange={(event) => setPocketId(event.target.value === "all" ? null : event.target.value)}
            className="h-8 max-w-32 rounded-lg border border-input bg-background px-2 text-[11px] outline-none focus-visible:ring-1 focus-visible:ring-primary"
            aria-label="Filter kantong chart"
          >
            <option value="all">Semua</option>
            {pockets.map((pocket) => <option key={pocket.id} value={pocket.id}>{pocket.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><i className="size-2 rounded-full bg-[var(--chart-1)]" /> Pemasukan</span>
          <span className="flex items-center gap-1"><i className="size-2 rounded-full bg-[var(--chart-1)] opacity-45" /> Pengeluaran</span>
        </div>
      </CardHeader>
      <CardContent className="px-2 pb-4">
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={visibleData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }} barCategoryGap="28%">
              <CartesianGrid horizontal vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.45 }}
                contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", fontSize: 11 }}
                formatter={(value, name) => [formatRupiah(Number(value)), name === "income" ? "Pemasukan" : "Pengeluaran"]}
              />
              <Bar dataKey="income" fill="var(--chart-1)" radius={[5, 5, 0, 0]} maxBarSize={18} />
              <Bar dataKey="expense" fill="var(--chart-1)" fillOpacity={0.45} radius={[5, 5, 0, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
