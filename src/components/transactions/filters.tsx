"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import type { Pocket, Category } from "@/types/database";

export function TransactionFilters({
  pockets,
  categories,
  current,
}: {
  pockets: Pocket[];
  categories: Category[];
  current: { pocket?: string; type?: string; category?: string; from?: string; to?: string; q?: string };
}) {
  const hasActive = Boolean(current.pocket || current.type || current.category || current.from || current.to || current.q);
  const filterActiveCount = [current.pocket, current.type, current.category, current.from, current.to].filter(Boolean).length;
  const [pocket, setPocket] = React.useState(current.pocket ?? "");
  const [type, setType] = React.useState(current.type ?? "");
  const [category, setCategory] = React.useState(current.category ?? "");
  const [open, setOpen] = React.useState(hasActive);

  React.useEffect(() => {
    // eslint-disable-next-line
    setPocket(current.pocket ?? "");
    setType(current.type ?? "");
    setCategory(current.category ?? "");
  }, [current.pocket, current.type, current.category]);

  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [open]);

  return (
    <form method="GET" className="relative">
      <div className="rounded-[20px] border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input name="q" defaultValue={current.q ?? ""} placeholder="Cari deskripsi..." className="pl-9 pr-9" />
            {current.q ? (
              <Link href="/transactions" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 hover:bg-accent">
                <X className="size-3.5 text-muted-foreground" />
              </Link>
            ) : null}
          </div>
          <Button
            type="button"
            variant={open || filterActiveCount > 0 ? "secondary" : "outline"}
            size="icon"
            className="relative size-9 shrink-0 rounded-xl border"
            onClick={() => setOpen((v) => !v)}
            aria-label="Filter"
            aria-expanded={open}
          >
            <SlidersHorizontal className="size-4" />
            {filterActiveCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                {filterActiveCount}
              </span>
            ) : null}
          </Button>
          {hasActive && (
            <Link href="/transactions" className="hidden sm:inline-flex h-9 items-center gap-1 rounded-xl border bg-background px-3 text-xs font-medium">
              <X className="size-3" /> Reset
            </Link>
          )}
        </div>

        {/* persist Select values even when drawer closed */}
        <input type="hidden" name="pocket" value={pocket} />
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="category" value={category} />
        {!open && current.from ? <input type="hidden" name="from" value={current.from} /> : null}
        {!open && current.to ? <input type="hidden" name="to" value={current.to} /> : null}
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              initial={{ y: "-100%" }}
              animate={{ y: 0 }}
              exit={{ y: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed inset-x-0 top-0 z-50 mx-auto w-full max-w-[430px] rounded-b-[20px] border-b bg-card shadow-xl"
            >
              <div className="p-4 pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Filter Transaksi</h3>
                  <Button type="button" variant="ghost" size="icon" className="size-8 rounded-full" onClick={() => setOpen(false)} aria-label="Tutup filter">
                    <X className="size-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Kantong</label>
                    <Select value={pocket || "__all__"} onValueChange={(v) => setPocket(v === "__all__" ? "" : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Semua kantong" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Semua kantong</SelectItem>
                        {pockets.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Tipe</label>
                    <Select value={type || "__all__"} onValueChange={(v) => setType(v === "__all__" ? "" : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Semua tipe" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Semua tipe</SelectItem>
                        <SelectItem value="income">Pemasukan</SelectItem>
                        <SelectItem value="expense">Pengeluaran</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Kategori</label>
                    <Select value={category || "__all__"} onValueChange={(v) => setCategory(v === "__all__" ? "" : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Semua kategori" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Semua kategori</SelectItem>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Dari tgl</label>
                    <Input type="date" name="from" defaultValue={current.from ?? ""} />
                  </div>
                  <div className="col-span-2">
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Sampai tgl</label>
                    <Input type="date" name="to" defaultValue={current.to ?? ""} />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button type="submit" size="sm" className="flex-1 rounded-xl" onClick={() => setOpen(false)}>
                    Terapkan filter
                  </Button>
                  {hasActive ? (
                    <Link href="/transactions" className="flex-1" onClick={() => setOpen(false)}>
                      <Button type="button" variant="outline" size="sm" className="w-full rounded-xl">
                        Reset filter
                      </Button>
                    </Link>
                  ) : (
                    <Button type="button" variant="outline" size="sm" className="flex-1 rounded-xl" onClick={() => setOpen(false)}>
                      Batal
                    </Button>
                  )}
                </div>

                <div className="mx-auto h-1 w-12 rounded-full bg-muted" />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </form>
  );
}
