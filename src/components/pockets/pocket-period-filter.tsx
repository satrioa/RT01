"use client";

import * as React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Period = "today" | "this_week" | "this_month" | "custom";

export function PocketPeriodFilter({
  initialPeriod,
  initialFrom,
  initialTo,
}: {
  initialPeriod: Period;
  initialFrom: string;
  initialTo: string;
}) {
  const [period, setPeriod] = React.useState<Period>(initialPeriod);

  return (
    <form method="GET" className="rounded-2xl border bg-card p-3">
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Periode</label>
            <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <SelectTrigger className="h-9 rounded-xl text-xs">
                <SelectValue placeholder="Pilih periode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hari ini</SelectItem>
                <SelectItem value="this_week">Minggu ini</SelectItem>
                <SelectItem value="this_month">Bulan ini</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            <input type="hidden" name="period" value={period} />
          </div>
          <div className="flex items-end">
            <Button type="submit" size="sm" className="h-9 rounded-xl px-5">
              Filter
            </Button>
          </div>
        </div>
        {period === "custom" && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Dari</label>
              <Input type="date" name="from" defaultValue={initialFrom} className="h-9 rounded-xl text-xs" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Sampai</label>
              <Input type="date" name="to" defaultValue={initialTo} className="h-9 rounded-xl text-xs" />
            </div>
          </div>
        )}
      </div>
    </form>
  );
}
