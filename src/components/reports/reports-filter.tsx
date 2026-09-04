"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export function ReportsFilter({ initialRange, initialFrom, initialTo }: { initialRange: string; initialFrom: string; initialTo: string }) {
  const router = useRouter();
  const [range, setRange] = React.useState(initialRange);
  const [from, setFrom] = React.useState(initialFrom);
  const [to, setTo] = React.useState(initialTo);
  const initialMount = React.useRef(true);

  // auto-apply when periode dropdown changes (tanpa button)
  const handleRangeChange = (v: string) => {
    setRange(v);
    if (v !== "custom") {
      const params = new URLSearchParams();
      params.set("range", v);
      router.push(`/reports?${params.toString()}`);
    }
  };

  // auto-apply untuk custom ketika tanggal lengkap
  React.useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false;
      return;
    }
    if (range === "custom" && from && to) {
      const params = new URLSearchParams();
      params.set("range", "custom");
      params.set("from", from);
      params.set("to", to);
      router.push(`/reports?${params.toString()}`);
    }
  }, [from, to, range, router]);

  // compact header-friendly without card & tanpa button Terapkan
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Select value={range} onValueChange={handleRangeChange}>
          <SelectTrigger className="h-8 w-[148px] shrink-0 rounded-full border bg-card px-3 text-xs font-medium">
            <SelectValue placeholder="Pilih periode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="this_month">Bulan ini</SelectItem>
            <SelectItem value="last_month">Bulan lalu</SelectItem>
            <SelectItem value="this_year">Tahun ini</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {range === "custom" && (
        <div className="grid grid-cols-2 gap-2">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 rounded-xl text-xs" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 rounded-xl text-xs" />
        </div>
      )}
    </div>
  );
}

export function ReportsFilterCard({ initialRange, initialFrom, initialTo }: { initialRange: string; initialFrom: string; initialTo: string }) {
  // fallback card version if needed elsewhere — wrapper compact
  return (
    <div className="rounded-[20px] border bg-card p-3">
      <ReportsFilter initialRange={initialRange} initialFrom={initialFrom} initialTo={initialTo} />
      <p className="mt-2 text-center text-[11px] text-muted-foreground">Transfer tidak dihitung</p>
    </div>
  );
}
