import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { hasSupabaseEnv, DEV_RT_ID } from "@/lib/env";
import { Card, CardContent } from "@/components/ui/card";
import { TransactionEditForm } from "@/components/transactions/transaction-edit-form";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EditTransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!hasSupabaseEnv()) {
    return <div className="mx-auto max-w-[430px] p-5 text-sm text-muted-foreground">Supabase belum dikonfigurasi.</div>;
  }

  const supabase = createServerClient();
  const rtId = DEV_RT_ID;

  const [{ data: tx }, pRes, cRes] = await Promise.all([
    supabase.from("transactions").select("*").eq("id", id).eq("rt_id", rtId).maybeSingle(),
    supabase.from("pockets").select("*").eq("rt_id", rtId).order("sort_order"),
    supabase.from("categories").select("*").eq("rt_id", rtId).eq("is_active", true).order("name"),
  ]);

  if (!tx) notFound();

  const pockets = (pRes.data as import("@/types/database").Pocket[] | null) ?? [];
  const categories = (cRes.data as import("@/types/database").Category[] | null) ?? [];

  if (pockets.length === 0) {
    return (
      <div className="min-h-dvh bg-background">
        <div className="mx-auto w-full max-w-[430px] bg-background">
          <header className="flex items-center gap-3 border-b bg-card px-5 py-4">
            <Link href={`/transactions/${id}`} className="flex size-9 items-center justify-center rounded-full border bg-card">
              <ArrowLeft className="size-4" />
            </Link>
            <h1 className="text-sm font-semibold">Edit transaksi</h1>
          </header>
          <main className="p-5">
            <Card className="border-dashed">
              <CardContent className="p-6 text-center text-sm text-muted-foreground">Buat kantong terlebih dahulu di Pengaturan.</CardContent>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-background">
        <header className="flex items-center gap-3 border-b bg-card px-5 py-4">
          <Link href={`/transactions/${id}`} className="flex size-9 items-center justify-center rounded-full border bg-card">
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h1 className="text-sm font-semibold">Edit Transaksi</h1>
            <p className="text-xs text-muted-foreground">Pemasukan & pengeluaran — bebas ubah</p>
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-4 p-5">
          <TransactionEditForm transaction={tx as import("@/types/database").Transaction} pockets={pockets} categories={categories} />

          <Card className="border-dashed">
            <CardContent className="p-3 text-xs leading-relaxed text-muted-foreground">Aplikasi pribadi — kategori tidak dibatasi tipe lagi.</CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
