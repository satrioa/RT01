import { createServerClient } from "@/lib/supabase/server";
import { hasSupabaseEnv, DEV_RT_ID } from "@/lib/env";
import { ExcelImportClient } from "@/components/import/excel-import-client";
import { BottomNav, BottomNavSpacer } from "@/components/layout/bottom-nav";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  if (!hasSupabaseEnv()) {
    return (
      <div className="min-h-dvh bg-background">
        <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-background">
          <header className="border-b bg-card px-5 py-4">
            <h1 className="text-sm font-semibold">Import Excel</h1>
            <p className="text-xs text-muted-foreground">Upload → Preview → Map → Validate → Import</p>
          </header>
          <main className="p-5">
            <Card className="border-warning/30 bg-warning/5">
              <CardContent className="flex gap-3 p-4">
                <AlertTriangle className="size-4 shrink-0 text-warning" />
                <p className="text-xs leading-relaxed">Supabase belum dikonfigurasi. Import butuh koneksi DB.</p>
              </CardContent>
            </Card>
          </main>
          <BottomNavSpacer />
        </div>
        <BottomNav />
      </div>
    );
  }

  const supabase = createServerClient();
  const rtId = DEV_RT_ID;

  const [pRes, cRes] = await Promise.all([
    supabase.from("pockets").select("id, name, is_active, sort_order").eq("rt_id", rtId).order("sort_order"),
    supabase.from("categories").select("id, name, type, is_active").eq("rt_id", rtId).eq("is_active", true).order("name"),
  ]);

  const pockets = ((pRes.data as { id: string; name: string; is_active: boolean; sort_order: number }[] | null) ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    description: null,
    icon: null,
    color: null,
    is_active: p.is_active,
    sort_order: p.sort_order,
    rt_id: rtId,
    created_at: "",
    updated_at: "",
  }));

  const categories = ((cRes.data as { id: string; name: string; type: string; is_active: boolean }[] | null) ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type as "income" | "expense" | "both",
    is_active: c.is_active,
    rt_id: rtId,
    created_at: "",
    updated_at: "",
  }));

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-background">
        <header className="sticky top-0 z-10 border-b bg-card px-5 py-4">
          <h1 className="text-sm font-semibold">Import Excel</h1>
          <p className="text-xs text-muted-foreground">Migrasi data historis ke ledger yang sama</p>
        </header>
        <main className="flex flex-1 flex-col p-5 pb-6">
          <ExcelImportClient pockets={pockets as unknown as import("@/types/database").Pocket[]} categories={categories as unknown as import("@/types/database").Category[]} />
        </main>
        <BottomNavSpacer />
      </div>
      <BottomNav />
    </div>
  );
}
