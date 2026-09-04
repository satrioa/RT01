"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { AmountInput } from "./amount-input";
import { createTransactionAction } from "@/lib/actions/transactions";
import { useToast } from "@/components/ui/toaster";
import { Loader2 } from "lucide-react";
import type { Pocket, Category } from "@/types/database";

export function TransactionForm({
  pockets,
  categories,
  defaultType = "expense",
  defaultPocketId,
}: {
  pockets: Pocket[];
  categories: Category[];
  defaultType?: "income" | "expense";
  defaultPocketId?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [type, setType] = React.useState<"income" | "expense">(defaultType);
  const [submitting, setSubmitting] = React.useState(false);

  const filteredCategories = React.useMemo(
    () => categories.filter((c) => c.type === type || c.type === "both"),
    [categories, type]
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    // Force type to current tab
    fd.set("type", type);
    const res = await createTransactionAction(fd);
    setSubmitting(false);
    if (res.ok) {
      toast({ title: type === "income" ? "Pemasukan tersimpan" : "Pengeluaran tersimpan", description: "Data berhasil disimpan." });
      router.push("/transactions");
      router.refresh();
    } else {
      toast({ title: "Gagal menyimpan", description: res.error, variant: "error" });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Type toggle */}
      <div className="grid grid-cols-2 gap-2 rounded-2xl border bg-card p-1">
        <button
          type="button"
          onClick={() => setType("income")}
          className={`rounded-xl py-2.5 text-sm font-semibold transition-colors ${type === "income" ? "bg-success text-success-foreground" : "text-muted-foreground"}`}
        >
          Pemasukan
        </button>
        <button
          type="button"
          onClick={() => setType("expense")}
          className={`rounded-xl py-2.5 text-sm font-semibold transition-colors ${type === "expense" ? "bg-destructive text-destructive-foreground" : "text-muted-foreground"}`}
        >
          Pengeluaran
        </button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="pocket_id">Kantong *</Label>
        <Select name="pocket_id" id="pocket_id" required defaultValue={defaultPocketId ?? pockets[0]?.id ?? ""}>
          <option value="" disabled>
            Pilih kantong
          </option>
          {pockets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {p.is_active ? "Aktif" : "Arsip"}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Jumlah *</Label>
        <AmountInput name="amount" required placeholder="Rp 75.000" />
        <p className="text-xs text-muted-foreground">Tidak perlu ketik desimal. Contoh: Rp 75.000</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="category_id">Kategori</Label>
        <Select name="category_id" id="category_id" defaultValue="">
          <option value="">Tanpa kategori</option>
          {filteredCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.type})
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Deskripsi</Label>
        <Textarea name="description" id="description" placeholder="Contoh: Iuran warga Jan 2026" rows={2} maxLength={500} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="transaction_date">Tanggal</Label>
        <Input type="date" name="transaction_date" id="transaction_date" defaultValue={new Date().toISOString().slice(0, 10)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="attachment">Bukti / Lampiran</Label>
        <Input type="file" name="attachment" id="attachment" accept="image/*,application/pdf" />
        <p className="text-xs text-muted-foreground">Opsional — foto bukti atau PDF. Max ~5MB.</p>
      </div>

      <Card className="border-dashed bg-muted/30">
        <CardContent className="p-3 text-xs leading-relaxed text-muted-foreground">
          Transaksi akan menambah/mengurangi saldo kantong terpilih. Saldo dihitung dari ledger — tidak disimpan manual.
        </CardContent>
      </Card>

      <Button type="submit" disabled={submitting} className="h-11 rounded-xl">
        {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
        Simpan {type === "income" ? "Pemasukan" : "Pengeluaran"}
      </Button>
    </form>
  );
}
