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
  const pocketsError = (pRes.error as { message?: string } | null)?.message ?? null;
  const categoriesError = (cRes.error as { message?: string } | null)?.message ?? null;

  if (pockets.length === 0) {
    const hasError = !!pocketsError || !!categoriesError;
    return (
      <div className="min-h-dvh bg-background">
        <div className="mx-auto w-full max-w-[430px] bg-background">
          <header className="flex items-center gap-3 border-b bg-card px-5 py-4">
            <Link href="/transactions" className="flex size-9 items-center justify-center rounded-full border bg-card">
              <ArrowLeft className="size-4" />
            </Link>
            <h1 className="text-sm font-semibold">Tambah transaksi</h1>
          </header>
          <main className="p-5 space-y-3">
            <Card className="border-dashed"><CardContent className="p-6 text-center text-sm text-muted-foreground">Buat kantong terlebih dahulu di Pengaturan.</CardContent></Card>
            {hasError && (
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="p-4 text-xs leading-relaxed text-muted-foreground">
                  <p className="font-semibold text-destructive">Gagal memuat kantong (RLS / env):</p>
                  <p className="mt-1 font-mono text-[11px] break-all">{pocketsError ?? categoriesError}</p>
                  <p className="mt-2">Pastikan .env berisi NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY dan migrasi 001-002 sudah dijalankan. Cek Supabase Dashboard → Table Editor → pockets untuk RT {rtId}.</p>
                </CardContent>
              </Card>
            )}
            <Link href="/pengaturan" className="flex w-full justify-center rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground">Ke Pengaturan →</Link>
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
