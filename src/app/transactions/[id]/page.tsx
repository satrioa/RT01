import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { hasSupabaseEnv, DEV_RT_ID } from "@/lib/env";
import { formatRupiah, formatDateShort } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Paperclip } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!hasSupabaseEnv()) {
    return <div className="mx-auto max-w-[430px] p-5 text-sm text-muted-foreground">Supabase belum dikonfigurasi.</div>;
  }

  const supabase = createServerClient();
  const rtId = DEV_RT_ID;

  const { data: tx } = await supabase
    .from("transactions")
    .select("*, pocket:pockets(name), category:categories(name)")
    .eq("id", id)
    .eq("rt_id", rtId)
    .maybeSingle();

  if (!tx) {
    // Try transfer
    const { data: tr } = await supabase.from("transfers").select("*").eq("id", id).eq("rt_id", rtId).maybeSingle();
    if (tr) {
      const t = tr as unknown as { amount: string; description: string | null; transaction_date: string; from_pocket_id: string; to_pocket_id: string };
      return (
        <div className="min-h-dvh bg-background">
          <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-background">
            <header className="flex items-center gap-3 border-b bg-card px-5 py-4">
              <Link href="/transactions" className="flex size-9 items-center justify-center rounded-full border bg-card"><ArrowLeft className="size-4" /></Link>
              <h1 className="text-sm font-semibold">Detail transfer</h1>
            </header>
            <main className="p-5">
              <Card><CardHeader><CardTitle className="text-sm">Transfer</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p>{t.description ?? "Pindah kantong"}</p><p className="font-semibold">{formatRupiah(Number(t.amount))}</p><p className="text-xs text-muted-foreground">{formatDateShort(t.transaction_date)}</p></CardContent></Card>
            </main>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-dvh bg-background">
        <div className="mx-auto w-full max-w-[430px] bg-background">
          <header className="flex items-center gap-3 border-b bg-card px-5 py-4">
            <Link href="/transactions" className="flex size-9 items-center justify-center rounded-full border bg-card"><ArrowLeft className="size-4" /></Link>
            <h1 className="text-sm font-semibold">Tidak ditemukan</h1>
          </header>
          <main className="p-5"><Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Transaksi tidak ditemukan.</CardContent></Card></main>
        </div>
      </div>
    );
  }

  const row = tx as unknown as { amount: string; type: string; description: string | null; transaction_date: string; source: string; pocket: { name: string } | null; category: { name: string } | null };

  const { data: attachments } = await supabase.from("transaction_attachments").select("*").eq("transaction_id", id);

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-background">
        <header className="flex items-center gap-3 border-b bg-card px-5 py-4">
          <Link href="/transactions" className="flex size-9 items-center justify-center rounded-full border bg-card"><ArrowLeft className="size-4" /></Link>
          <h1 className="text-sm font-semibold">Detail transaksi</h1>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-5">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{row.category?.name ?? "Tanpa kategori"}</CardTitle>
                <Badge variant={row.type === "income" ? "success" : "destructive"}>{row.type === "income" ? "Pemasukan" : "Pengeluaran"}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className={`text-2xl font-bold tabular-nums ${row.type === "income" ? "text-success" : "text-destructive"}`}>
                {row.type === "income" ? "+" : "-"}
                {formatRupiah(Number(row.amount))}
              </p>
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/40 p-3 text-xs">
                <div><p className="text-muted-foreground">Kantong</p><p className="font-medium">{row.pocket?.name ?? "—"}</p></div>
                <div><p className="text-muted-foreground">Tanggal</p><p className="font-medium">{formatDateShort(row.transaction_date)}</p></div>
                <div className="col-span-2"><p className="text-muted-foreground">Deskripsi</p><p className="font-medium">{row.description ?? "—"}</p></div>
                <div><p className="text-muted-foreground">Sumber</p><p className="font-medium">{row.source}</p></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Paperclip className="size-4" /> Lampiran</CardTitle></CardHeader>
            <CardContent>
              {(attachments as unknown as { id: string; file_url: string; file_type: string | null }[] | null)?.length ? (
                <div className="space-y-2">
                  {(attachments as unknown as { id: string; file_url: string; file_type: string | null }[]).map((a) => (
                    <a key={a.id} href={a.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs hover:bg-accent">
                      <Paperclip className="size-3" /> <span className="truncate">{a.file_url}</span> <span className="ml-auto text-muted-foreground">{a.file_type ?? ""}</span>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Tidak ada lampiran.</p>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
