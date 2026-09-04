import { Select } from "@/components/ui/select";
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
          <Select name="pocket" defaultValue={current.pocket ?? ""}>
            <option value="">Semua kantong</option>
            {pockets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Tipe</label>
          <Select name="type" defaultValue={current.type ?? ""}>
            <option value="">Semua tipe</option>
            <option value="income">Pemasukan</option>
            <option value="expense">Pengeluaran</option>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Kategori</label>
          <Select name="category" defaultValue={current.category ?? ""}>
            <option value="">Semua kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
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

      <Button type="submit" size="sm" className="w-full rounded-xl">
        Terapkan filter
      </Button>
    </form>
  );
}
