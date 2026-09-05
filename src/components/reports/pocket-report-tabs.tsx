/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { BarChart3 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GlideUnderline } from "@/components/workspace-tabs/workspace-tabs";
import { MonthSelector } from "@/components/reports/month-selector";
import { PocketReportContent, type PocketReportData } from "@/components/reports/pocket-report-content";

function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

export function PocketReportTabs({
  pockets,
  year,
  month,
  initialKey,
  reportsMap,
  rtName,
  rwNumber,
}: {
  pockets: { id: string; name: string; color: string | null }[];
  year: number;
  month: number;
  initialKey: string;
  reportsMap: Record<string, PocketReportData>;
  rtName: string;
  rwNumber: string;
}) {
  const router = useRouter();
  const orderedKeys = React.useMemo(() => [...pockets.map((p) => p.id), "rekap"], [pockets]);
  const [activeKey, setActiveKey] = React.useState(initialKey);
  const [dir, setDir] = React.useState(0);

  // sync from server when year/month/pocket in URL changes (e.g. MonthSelector navigation)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => {
    setActiveKey(initialKey);
  }, [initialKey]);

  const activeIndex = orderedKeys.indexOf(activeKey);
  const activePocket = pockets.find((p) => p.id === activeKey) ?? null;
  const isRekap = activeKey === "rekap";

  const handleTabChange = React.useCallback(
    (nextKeyRaw: unknown) => {
      const nextKey = String(nextKeyRaw as string);
      if (nextKey === activeKey) return;
      const prevIdx = orderedKeys.indexOf(activeKey);
      const nextIdx = orderedKeys.indexOf(nextKey);
      setDir(nextIdx > prevIdx ? 1 : -1);
      setActiveKey(nextKey);
      router.replace(`/reports?year=${year}&month=${month}&pocket=${nextKey}`, { scroll: false });
    },
    [activeKey, orderedKeys, router, year, month]
  );

  const goDelta = React.useCallback(
    (delta: number) => {
      const nextIdx = Math.min(Math.max(activeIndex + delta, 0), orderedKeys.length - 1);
      if (nextIdx === activeIndex) return;
      const nextKey = orderedKeys[nextIdx];
      setDir(delta > 0 ? 1 : -1);
      setActiveKey(nextKey);
      router.replace(`/reports?year=${year}&month=${month}&pocket=${nextKey}`, { scroll: false });
    },
    [activeIndex, orderedKeys, router, year, month]
  );

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const threshold = 64;
    const velocityThreshold = 500;
    const offsetX = info.offset.x;
    const velocityX = info.velocity.x;
    if (offsetX < -threshold || velocityX < -velocityThreshold) {
      goDelta(1);
    } else if (offsetX > threshold || velocityX > velocityThreshold) {
      goDelta(-1);
    }
  };

  const prev = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
  const prevYear = prev.getFullYear();
  const prevMonth = prev.getMonth() + 1;

  const activeData = reportsMap[activeKey] ?? { selected: null, list: [], prev: null, showFailsafe: false };

  return (
    <>
      <header className="sticky top-0 z-20 border-b bg-card">
        <div className="flex items-center gap-2 px-5 py-4">
          <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <BarChart3 className="size-4" />
          </span>
          <div>
            <h1 className="text-sm font-semibold">Laporan Bulanan</h1>
            <p className="text-xs text-muted-foreground">
              {rtName} / RW {rwNumber} • {monthLabel(year, month)}
              {activePocket ? ` • ${activePocket.name}` : isRekap ? " • Rekap" : ""}
            </p>
          </div>
        </div>
        {/* Tabs kantong — workspace-tabs style: line variant + gliding underline, tanpa refresh */}
        <div className="border-t bg-card">
          <Tabs value={activeKey} onValueChange={handleTabChange as never} className="w-full gap-0">
            <div className="flex items-center justify-between gap-3 border-border/40 border-b">
              <div className="flex-1 overflow-x-auto pl-5 pr-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <TabsList variant="line" className="relative h-9 gap-1 rounded-none bg-transparent p-0">
                  {pockets.map((p) => (
                    <TabsTrigger
                      key={p.id}
                      value={p.id}
                      className="h-full flex-none rounded-none px-3 font-mono text-xs after:hidden hover:text-foreground data-active:bg-transparent data-active:text-foreground dark:data-active:border-transparent dark:data-active:bg-transparent"
                    >
                      {p.name}
                    </TabsTrigger>
                  ))}
                  <TabsTrigger
                    value="rekap"
                    className="h-full flex-none rounded-none px-3 font-mono text-xs after:hidden hover:text-foreground data-active:bg-transparent data-active:text-foreground dark:data-active:border-transparent dark:data-active:bg-transparent"
                  >
                    Rekap RT
                  </TabsTrigger>
                  <GlideUnderline activeId={activeKey} />
                </TabsList>
              </div>
            </div>
          </Tabs>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-6 p-5 pb-6">
        {/* MonthSelector stays outside swipe area — month change = reload, pocket param follows activeKey */}
        <MonthSelector selectedYear={year} selectedMonth={month} pocketParam={activeKey} count={12} />

        <div className="overflow-hidden">
          <AnimatePresence mode="wait" initial={false} custom={dir}>
            <motion.div
              key={activeKey}
              custom={dir}
              initial={{ x: dir * 48, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: dir * -48, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.14}
              dragMomentum={false}
              onDragEnd={handleDragEnd}
              className="touch-pan-y cursor-grab active:cursor-grabbing"
            >
              <PocketReportContent
                pocket={activePocket}
                isRekap={isRekap}
                data={activeData}
                year={year}
                month={month}
                prevYear={prevYear}
                prevMonth={prevMonth}
                pocketsCount={pockets.length}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </>
  );
}
