import Link from "next/link";
import { BottomNav, BottomNavSpacer } from "@/components/layout/bottom-nav";
import { Card, CardContent } from "@/components/ui/card";
import { LinkTelegramCard } from "@/components/telegram/link-telegram";
import { PocketManager } from "@/components/pockets/pocket-manager";
import { createServerClient } from "@/lib/supabase/server";
import { hasSupabaseEnv, DEV_RT_ID } from "@/lib/env";
import { FileSpreadsheet } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PengaturanPage() {
  let pockets: import("@/types/database").Pocket[] = [];
  let loadError: string | null = null;

  if (hasSupabaseEnv()) {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("pockets")
      .select("*")
      .eq("rt_id", DEV_RT_ID)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    pockets = (data as import("@/types/database").Pocket[] | null) ?? [];
    loadError = (error as { message?: string } | null)?.message ?? null;
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-background">
        <header className="sticky top-0 z-10 border-b bg-card px-5 py-4">
          <h1 className="text-sm font-semibold">Pengaturan</h1>
          <p className="text-xs text-muted-foreground">RT, kantong, kategori, Telegram</p>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-5 pb-6">
          <Card>
            <CardContent className="p-4">
              <Link href="/import" className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <FileSpreadsheet className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">Import Excel</p>
                  <p className="text-xs text-muted-foreground">Migrasi data historis → ledger</p>
                </div>
                <span className="text-xs font-medium text-primary">Buka →</span>
              </Link>
            </CardContent>
          </Card>

          <LinkTelegramCard />

          {/* Kantong CRUD */}
          {loadError ? (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-4 text-xs leading-relaxed text-muted-foreground">
                <p className="font-semibold text-destructive">Gagal memuat kantong:</p>
                <p className="mt-1 font-mono text-[11px] break-all">{loadError}</p>
              </CardContent>
            </Card>
          ) : null}
          <PocketManager pockets={pockets} />
        </main>
        <BottomNavSpacer />
      </div>
      <BottomNav />
    </div>
  );
}
