"use client";

import * as React from "react";
import { motion, AnimatePresence, useInView } from "motion/react";
import { ChevronDown } from "lucide-react";
import { TransactionRow } from "./transaction-row";
import type { TxWithMeta } from "@/lib/data/transactions";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

function monthKey(d: string) {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = dt.getMonth() + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

function groupByMonth(txs: TxWithMeta[]) {
  const map = new Map<string, TxWithMeta[]>();
  for (const tx of txs) {
    const key = monthKey(tx.transaction_date);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(tx);
  }
  // sort keys descending (newest first)
  const sortedKeys = Array.from(map.keys()).sort((a, b) => (b > a ? 1 : -1));
  return sortedKeys.map((k) => ({ key: k, label: monthLabel(k), items: map.get(k)! }));
}

const AnimatedGroupItem = ({
  children,
  index,
}: {
  children: React.ReactNode;
  index: number;
}) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref as never, { amount: 0.3 } as never);
  return (
    <motion.div
      ref={ref}
      initial={{ scale: 0.96, opacity: 0, y: 8 }}
      animate={inView ? { scale: 1, opacity: 1, y: 0 } : { scale: 0.96, opacity: 0, y: 8 }}
      transition={{ duration: 0.22, delay: index * 0.03 }}
    >
      {children}
    </motion.div>
  );
};

export function TransactionGroupedList({ txs }: { txs: TxWithMeta[] }) {
  const groups = React.useMemo(() => groupByMonth(txs), [txs]);
  const [open, setOpen] = React.useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    groups.forEach((g, idx) => {
      init[g.key] = idx === 0; // most recent open, others collapsed
    });
    return init;
  });

  // sync when txs change (filter change) -> reopen first group
  React.useEffect(() => {
    const init: Record<string, boolean> = {};
    groups.forEach((g, idx) => {
      init[g.key] = idx === 0;
    });
    setOpen(init);
  }, [groups]);

  const toggle = (key: string) => setOpen((s) => ({ ...s, [key]: !s[key] }));

  if (groups.length === 0) return null;

  const totalCount = txs.length;

  return (
    <div className="space-y-3">
      <p className="px-1 text-xs text-muted-foreground">
        {totalCount} transaksi • {groups.length} bulan
      </p>

      <div className="space-y-3">
        {groups.map((g) => {
          const isOpen = open[g.key] ?? false;
          const income = g.items.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
          const expense = g.items.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
          const net = income - expense;

          return (
            <div key={g.key} className="overflow-hidden rounded-[16px] border bg-card">
              <button
                type="button"
                onClick={() => toggle(g.key)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-none">{g.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {g.items.length} transaksi • {net >= 0 ? "+" : ""}
                    {formatRupiah(net)}
                  </p>
                </div>
                <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                  {income > 0 && <span className="text-success">+{formatRupiah(income)}</span>}
                  {income > 0 && expense > 0 && <span className="mx-1">•</span>}
                  {expense > 0 && <span className="text-destructive">-{formatRupiah(expense)}</span>}
                </span>
                <ChevronDown
                  className={cn("size-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")}
                />
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2 px-2 pb-3 pt-1">
                      {g.items.map((t, idx) => (
                        <AnimatedGroupItem key={t.id} index={idx}>
                          <TransactionRow tx={t} />
                        </AnimatedGroupItem>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
