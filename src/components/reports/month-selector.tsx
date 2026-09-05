"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export function MonthSelector({
  selectedYear,
  selectedMonth,
  pocketParam,
  count = 12,
}: {
  selectedYear: number;
  selectedMonth: number;
  pocketParam: string;
  count?: number;
}) {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const months = React.useMemo(() => {
    const out: { year: number; month: number }[] = [];
    const now = new Date();
    for (let i = 0; i < count; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      out.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
    }
    return out;
  }, [count]);

  // auto scroll selected into view
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = months.findIndex((m) => m.year === selectedYear && m.month === selectedMonth);
    if (idx >= 0) {
      const child = el.children[idx] as HTMLElement | undefined;
      child?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [months, selectedYear, selectedMonth]);

  // drag handling
  const drag = React.useRef<{ down: boolean; x: number; left: number }>({ down: false, x: 0, left: 0 });
  function onPointerDown(e: React.PointerEvent) {
    const el = scrollRef.current;
    if (!el) return;
    drag.current = { down: true, x: e.clientX, left: el.scrollLeft };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current.down) return;
    const el = scrollRef.current;
    if (!el) return;
    const dx = e.clientX - drag.current.x;
    el.scrollLeft = drag.current.left - dx;
  }
  function onPointerUp(e: React.PointerEvent) {
    drag.current.down = false;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-2">
        <div className="relative flex min-w-0 flex-1 items-center gap-1">
          <div
            ref={scrollRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto scroll-smooth py-1 select-none touch-pan-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory cursor-grab active:cursor-grabbing"
          >
            {months.map(({ year, month }) => {
              const isSelected = year === selectedYear && month === selectedMonth;
              return (
                <Link
                  key={`${year}-${month}`}
                  href={`/reports?year=${year}&month=${month}&pocket=${pocketParam}`}
                  draggable={false}
                  className={`shrink-0 snap-center rounded-full px-3 py-1.5 text-xs font-medium transition whitespace-nowrap ${isSelected ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-accent"}`}
                >
                  {new Date(year, month - 1, 1).toLocaleDateString("id-ID", { month: "short", year: "2-digit" })}
                </Link>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
