"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteTransactionAction } from "@/lib/actions/transactions";
import { useToast } from "@/components/ui/toaster";
import { Pencil, Trash2, Loader2 } from "lucide-react";

export function TransactionActions({ id }: { id: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [deleting, setDeleting] = React.useState(false);

  async function handleDelete() {
    if (!confirm("Hapus transaksi ini? Saldo akan menyesuaikan.")) return;
    setDeleting(true);
    const res = await deleteTransactionAction(id);
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
    <div className="flex gap-2">
      <Link href={`/transactions/${id}/edit`} className="flex-1">
        <Button variant="outline" className="w-full rounded-xl">
          <Pencil className="size-4" /> Edit
        </Button>
      </Link>
      <Button variant="destructive" className="flex-1 rounded-xl" onClick={handleDelete} disabled={deleting}>
        {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
        Hapus
      </Button>
    </div>
  );
}
