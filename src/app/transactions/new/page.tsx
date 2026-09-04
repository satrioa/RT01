import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { hasSupabaseEnv, DEV_RT_ID } from "@/lib/env";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { TransferForm } from "@/components/transactions/transfer-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function NewTransactionPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; pocket?: string }>;
}) {
  const { type, pocket: pocketParam } = await searchParams;
  const tab = type === "transfer" ? "transfer" : type === "income" ? "income" : type === "expense" ? "expense" : "expense";

  if (!hasSupabaseEnv()) {
    return (
      <div className="min-h-dvh bg-background">
        <div className="mx-auto w-full max-w-[430px] bg-background p-5">
          <Card><CardContent className="p-6 text-sm text-muted-foreground">Supabase belum dikonfigurasi.</CardContent></Card>
        </div>
      </div>
    );
  }

  const supabase = createServerClient();
  const rtId = DEV_RT_ID;
  const [pRes, cRes] = await Promise.all([
    supabase.from("pockets").select("*").eq("rt_id", rtId).eq("is_active", true).order("sort_order"),
    supabase.from("categories").select("*").eq("rt_id", rtId).eq("is_active", true).order("name"),
  ]);

  const pockets = (pRes.data as unknown as import("@/types/database").Pocket[] | null) ?? [];
  const categories = (cRes.data as unknown as import("@/types/database").Category[] | null) ?? [];

  if (pockets.length === 0) {
    return (
      <div className="min-h-dvh bg-background">
        <div className="mx-auto w-full max-w-[430px] bg-background">
          <header className="flex items-center gap-3 border-b bg-card px-5 py-4">
            <Link href="/transactions" className="flex size-9 items-center justify-center rounded-full border bg-card">
              <ArrowLeft className="size-4" />
            </Link>
            <h1 className="text-sm font-semibold">Tambah transaksi</h1>
          </header>
          <main className="p-5">
            <Card className="border-dashed"><CardContent className="p-6 text-center text-sm text-muted-foreground">Buat kantong terlebih dahulu di Pengaturan.</CardContent></Card>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-background">
        <header className="flex items-center gap-3 border-b bg-card px-5 py-4">
          <Link href="/transactions" className="flex size-9 items-center justify-center rounded-full border bg-card">
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h1 className="text-sm font-semibold">{tab === "transfer" ? "Pindah Kantong" : "Tambah Transaksi"}</h1>
            <p className="text-xs text-muted-foreground">{tab === "transfer" ? "Transfer antar kantong" : "Pemasukan & Pengeluaran"}</p>
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-4 p-5">
          {/* Tab switcher */}
          <div className="flex gap-2">
            <Link href="/transactions/new?type=expense" className={`flex-1 rounded-xl border px-3 py-2 text-center text-sm font-medium ${tab !== "transfer" ? "bg-primary text-primary-foreground" : "bg-card"}`}>
              Transaksi
            </Link>
            <Link href="/transactions/new?type=transfer" className={`flex-1 rounded-xl border px-3 py-2 text-center text-sm font-medium ${tab === "transfer" ? "bg-primary text-primary-foreground" : "bg-card"}`}>
              Transfer
            </Link>
          </div>

          {tab === "transfer" ? (
            <TransferForm pockets={pockets} defaultFromPocketId={pocketParam} />
          ) : (
            <TransactionForm pockets={pockets} categories={categories} defaultType={tab as "income" | "expense"} defaultPocketId={pocketParam} />
          )}

          <Card className="border-dashed">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Catatan</CardTitle></CardHeader>
            <CardContent className="pt-0 text-xs leading-relaxed text-muted-foreground">
              rt_id ditentukan otomatis dari sesi — tidak dapat dimanipulasi dari client. Validasi kategori & kepemilikan kantong dilakukan server-side.
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
