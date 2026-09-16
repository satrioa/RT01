"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  activePocketId: controlledActivePocketId,
  onActivePocketChange,
}: {
  data: (ChartDatum & { pocketId: string | null })[];
  pockets: PocketOption[];
  activePocketId?: string | null;
  onActivePocketChange?: (id: string | null) => void;
}) {
  const [internalPocketId, setInternalPocketId] = React.useState<string | null>(null);
  const isControlled = controlledActivePocketId !== undefined;
  const activePocketId = isControlled ? controlledActivePocketId : internalPocketId;
  const setPocketId = (id: string | null) => {
    if (onActivePocketChange) onActivePocketChange(id);
    else setInternalPocketId(id);
  };
  const visibleData = data.filter((item) => item.pocketId === activePocketId);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">Pemasukan vs Pengeluaran</CardTitle>
          <Select
            value={activePocketId ?? "all"}
            onValueChange={(value) => setPocketId(value === "all" ? null : value)}
          >
            <SelectTrigger className="h-8 max-w-32 text-xs" aria-label="Filter kantong chart">
              <SelectValue placeholder="Semua" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              {pockets.map((pocket) => (
                <SelectItem key={pocket.id} value={pocket.id}>
                  {pocket.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><i className="size-2 rounded-full bg-[var(--chart-1)]" /> Pemasukan</span>
          <span className="flex items-center gap-1"><i className="size-2 rounded-full bg-[var(--chart-1)] opacity-45" /> Pengeluaran</span>
        </div>
      </CardHeader>
      <CardContent className="px-2 pb-4">
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={visibleData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }} barCategoryGap="16%" barGap={6}>
              <CartesianGrid horizontal vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.45 }}
                contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", fontSize: 11 }}
                formatter={(value, name) => [formatRupiah(Number(value)), name === "income" ? "Pemasukan" : "Pengeluaran"]}
              />
              <Bar dataKey="income" fill="var(--chart-1)" radius={[5, 5, 0, 0]} maxBarSize={32} />
              <Bar dataKey="expense" fill="var(--chart-1)" fillOpacity={0.45} radius={[5, 5, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
