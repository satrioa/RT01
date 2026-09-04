"use client";

import * as React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
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
  const [pocket, setPocket] = React.useState(current.pocket ?? "");
  const [type, setType] = React.useState(current.type ?? "");
  const [category, setCategory] = React.useState(current.category ?? "");

  React.useEffect(() => {
    // eslint-disable-next-line
    setPocket(current.pocket ?? "");
    setType(current.type ?? "");
    setCategory(current.category ?? "");
  }, [current.pocket, current.type, current.category]);

  return (
    <form method="GET" className="space-y-3 rounded-[20px] border bg-card p-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={current.q ?? ""} placeholder="Cari deskripsi..." className="pl-9" />
        </div>
        {hasActive && (
          <Link href="/transactions" className="inline-flex h-9 items-center gap-1 rounded-xl border bg-background px-3 text-xs font-medium">
            <X className="size-3" /> Reset
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
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
          <input type="hidden" name="pocket" value={pocket} />
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
          <input type="hidden" name="type" value={type} />
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
          <input type="hidden" name="category" value={category} />
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

      <Button type="submit" size="sm" className="w-full rounded-xl">
        Terapkan filter
      </Button>
    </form>
  );
}
