"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { AmountInput } from "./amount-input";
import { updateTransactionAction, deleteTransactionAction } from "@/lib/actions/transactions";
import { useToast } from "@/components/ui/toaster";
import { Loader2, Trash2 } from "lucide-react";
import type { Pocket, Category, Transaction } from "@/types/database";
import Link from "next/link";

export function TransactionEditForm({
  transaction,
  pockets,
  categories,
}: {
  transaction: Transaction;
  pockets: Pocket[];
  categories: Category[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [type, setType] = React.useState<"income" | "expense">(transaction.type);
  const [submitting, setSubmitting] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  // relaxed for personal app: show ALL categories (not filtered by type)
  const [pocketId, setPocketId] = React.useState<string>(transaction.pocket_id);
  const [categoryId, setCategoryId] = React.useState<string>(transaction.category_id ?? "__none__");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    fd.set("type", type);
    fd.set("pocket_id", pocketId);
    if (categoryId && categoryId !== "__none__") fd.set("category_id", categoryId);
    else fd.delete("category_id");
    const res = await updateTransactionAction(transaction.id, fd);
    setSubmitting(false);
    if (res.ok) {
      toast({ title: "Transaksi diperbarui", description: "Perubahan tersimpan — saldo kantong otomatis menyesuaikan." });
      router.push(`/transactions/${transaction.id}`);
      router.refresh();
    } else {
      toast({ title: "Gagal menyimpan", description: res.error, variant: "error" });
    }
  }

  async function handleDelete() {
    if (!confirm("Hapus transaksi ini? Saldo kantong akan menyesuaikan otomatis.")) return;
    setDeleting(true);
    const res = await deleteTransactionAction(transaction.id);
    setDeleting(false);
    if (res.ok) {
      toast({ title: "Transaksi dihapus" });
      router.push("/transactions");
      router.refresh();
    } else {
      toast({ title: "Gagal hapus", description: res.error, variant: "error" });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
      <p className="text-center text-[11px] text-muted-foreground">Aplikasi pribadi — bebas ubah pemasukan ↔ pengeluaran tanpa batasan kategori.</p>

      <div className="space-y-2">
        <Label>Kantong *</Label>
        <Select value={pocketId} onValueChange={setPocketId} required>
          <SelectTrigger>
            <SelectValue placeholder="Pilih kantong" />
          </SelectTrigger>
          <SelectContent>
            {pockets.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} — {p.is_active ? "Aktif" : "Arsip"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input type="hidden" name="pocket_id" value={pocketId} />
      </div>

      <div className="space-y-2">
        <Label>Jumlah *</Label>
        <AmountInput name="amount" required placeholder="Rp 75.000" defaultValue={transaction.amount} />
      </div>

      <div className="space-y-2">
        <Label>Kategori</Label>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger>
            <SelectValue placeholder="Tanpa kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Tanpa kategori</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} ({c.type})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input type="hidden" name="category_id" value={categoryId === "__none__" ? "" : categoryId} />
        <p className="text-[11px] text-muted-foreground">Kategori tidak dibatasi tipe lagi — pilih bebas.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-description">Deskripsi</Label>
        <Textarea name="description" id="edit-description" defaultValue={transaction.description ?? ""} placeholder="Contoh: Iuran warga Jan 2026" rows={2} maxLength={500} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-date">Tanggal</Label>
        <Input type="date" name="transaction_date" id="edit-date" defaultValue={transaction.transaction_date} />
      </div>

      <Card className="border-dashed bg-muted/30">
        <CardContent className="p-3 text-xs leading-relaxed text-muted-foreground">
          Edit bebas — saldo kantong dihitung ulang dari ledger (saldo awal + pemasukan - pengeluaran ± transfer).
        </CardContent>
      </Card>

      <Button type="submit" disabled={submitting} className="h-11 rounded-xl">
        {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
        Simpan Perubahan
      </Button>

      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => router.push(`/transactions/${transaction.id}`)}>
          Batal
        </Button>
        <Button type="button" variant="destructive" className="flex-1 rounded-xl" onClick={handleDelete} disabled={deleting}>
          {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
          Hapus Transaksi
        </Button>
      </div>

      <Link href="/transactions" className="text-center text-xs text-muted-foreground hover:underline">
        ← Kembali ke daftar transaksi
      </Link>
    </form>
  );
}
