import { BottomNavSpacer } from "@/components/layout/bottom-nav";
import { createServerClient } from "@/lib/supabase/server";
import { hasSupabaseEnv, DEV_RT_ID } from "@/lib/env";
import { SettingsCompact } from "@/components/settings/settings-compact";
import { getAiSettings, getEnvKeyStatus } from "@/lib/actions/ai-settings";
import { getAppearanceSettings } from "@/lib/actions/appearance";

export const dynamic = "force-dynamic";

export default async function PengaturanPage() {
  let pockets: import("@/types/database").Pocket[] = [];
  let loadError: string | null = null;
  let aiSettings: import("@/types/database").RtAiSettings | null = null;
  let envStatus: Record<string, boolean> = {};
  let appearance: import("@/types/database").RtAppearanceSettings | null = null;

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
    try {
      aiSettings = await getAiSettings();
      envStatus = await getEnvKeyStatus();
    } catch {}
    try {
      appearance = await getAppearanceSettings();
    } catch {}
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-background">
        <header className="sticky top-0 z-10 border-b bg-card px-5 py-4">
          <h1 className="text-sm font-semibold">Pengaturan</h1>
          <p className="text-xs text-muted-foreground">Kompak — Data & Integrasi</p>
        </header>
        <main className="flex flex-1 flex-col gap-3 p-4 pb-6">
          <SettingsCompact pockets={pockets} loadError={loadError} aiSettings={aiSettings} envStatus={envStatus} appearance={appearance} />
        </main>
        <BottomNavSpacer />
      </div>
    </div>
  );
}
