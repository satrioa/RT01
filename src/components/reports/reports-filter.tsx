"use client";

import * as React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ReportsFilter({ initialRange, initialFrom, initialTo }: { initialRange: string; initialFrom: string; initialTo: string }) {
  const [range, setRange] = React.useState(initialRange);

  return (
    <form method="GET" className="space-y-3 rounded-[20px] border bg-card p-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Periode</label>
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih periode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">Bulan ini</SelectItem>
              <SelectItem value="last_month">Bulan lalu</SelectItem>
              <SelectItem value="this_year">Tahun ini</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          <input type="hidden" name="range" value={range} />
        </div>
        <div className="flex flex-col justify-end">
          <Button type="submit" size="sm" className="rounded-xl">
            Terapkan
          </Button>
        </div>
      </div>
      {range === "custom" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Dari</label>
            <Input type="date" name="from" defaultValue={initialFrom} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Sampai</label>
            <Input type="date" name="to" defaultValue={initialTo} />
          </div>
        </div>
      )}
      <p className="text-center text-[11px] text-muted-foreground">Transfer tidak dihitung</p>
    </form>
  );
}
