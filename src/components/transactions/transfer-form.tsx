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
import { createTransferAction } from "@/lib/actions/transactions";
import { useToast } from "@/components/ui/toaster";
import { ArrowLeftRight, Info, Loader2 } from "lucide-react";
import type { Pocket } from "@/types/database";

export function TransferForm({ pockets, defaultFromPocketId }: { pockets: Pocket[]; defaultFromPocketId?: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [submitting, setSubmitting] = React.useState(false);
  const [from, setFrom] = React.useState(defaultFromPocketId ?? pockets[0]?.id ?? "");
  const [to, setTo] = React.useState(() => {
    if (defaultFromPocketId) {
      const other = pockets.find((p) => p.id !== defaultFromPocketId);
      return other?.id ?? pockets[0]?.id ?? "";
    }
    return pockets[1]?.id ?? pockets[0]?.id ?? "";
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (from === to) {
      toast({ title: "Kantong sama", description: "Kantong asal dan tujuan harus berbeda.", variant: "error" });
      return;
    }
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const res = await createTransferAction(fd);
    setSubmitting(false);
    if (res.ok) {
      toast({ title: "Transfer tersimpan", description: "Saldo kantong diperbarui." });
      router.push("/transactions");
      router.refresh();
    } else {
      toast({ title: "Gagal transfer", description: res.error, variant: "error" });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Card className="border-warning/20 bg-warning/10">
        <CardContent className="flex gap-3 p-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-warning/20 text-warning">
            <Info className="size-4" />
          </span>
          <p className="text-xs leading-relaxed">
            <span className="font-semibold">Transfer tidak mengubah total saldo RT.</span> Hanya memindahkan dana antar kantong.
            Contoh: Kas → BOP Rp500.000 mengurangi Kas dan menambah BOP, total tetap.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Label>Dari kantong *</Label>
        <Select value={from} onValueChange={setFrom} required>
          <SelectTrigger>
            <SelectValue placeholder="Pilih kantong" />
          </SelectTrigger>
          <SelectContent>
            {pockets.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input type="hidden" name="from_pocket_id" value={from} />
      </div>

      <div className="flex justify-center">
        <span className="flex size-8 items-center justify-center rounded-full border bg-card">
          <ArrowLeftRight className="size-4 text-muted-foreground" />
        </span>
      </div>

      <div className="space-y-2">
        <Label>Ke kantong *</Label>
        <Select value={to} onValueChange={setTo} required>
          <SelectTrigger>
            <SelectValue placeholder="Pilih kantong" />
          </SelectTrigger>
          <SelectContent>
            {pockets.map((p) => (
              <SelectItem key={p.id} value={p.id} disabled={p.id === from}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input type="hidden" name="to_pocket_id" value={to} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Jumlah *</Label>
        <AmountInput name="amount" required placeholder="Rp 500.000" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Catatan</Label>
        <Textarea name="description" id="description" placeholder="Contoh: Pindah dana operasional" rows={2} maxLength={500} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="transaction_date">Tanggal</Label>
        <Input type="date" name="transaction_date" id="transaction_date" defaultValue={new Date().toISOString().slice(0, 10)} />
      </div>

      <Button type="submit" disabled={submitting || !from || !to} className="h-11 rounded-xl">
        {submitting ? <Loader2 className="size-4 animate-spin" /> : <ArrowLeftRight className="size-4" />}
        Pindah Kantong
      </Button>
    </form>
  );
}
