import { BottomNavSpacer } from "@/components/layout/bottom-nav";
import { createServiceClient } from "@/lib/supabase/service";
import { hasSupabaseEnv, DEV_RT_ID } from "@/lib/env";
import { getMonthlyReport, listMonthlyReports } from "@/lib/reports/monthly-report-service";
import type { PocketReportData } from "@/components/reports/pocket-report-content";
import { PocketReportTabs } from "@/components/reports/pocket-report-tabs";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; pocket?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const selectedYear = sp.year ? Number(sp.year) : now.getFullYear();
  const selectedMonth = sp.month ? Number(sp.month) : now.getMonth() + 1;

  if (!hasSupabaseEnv()) {
    return <div className="mx-auto max-w-[430px] p-5 text-sm text-muted-foreground">Supabase belum dikonfigurasi.</div>;
  }

  const rtId = DEV_RT_ID;
  const supabase = createServiceClient();
  const { data: rtProfile } = await supabase.from("rt_profiles").select("name, rt_number, rw_number").eq("id", rtId).maybeSingle();
  const rtName = (rtProfile as { name?: string } | null)?.name ?? "RT 01";
  const rwNumber = (rtProfile as { rw_number?: string } | null)?.rw_number ?? "07";

  // Fetch active pockets for tabs (dinamis)
  const { data: pocketsData } = await supabase.from("pockets").select("id, name, color").eq("rt_id", rtId).eq("is_active", true).order("sort_order", { ascending: true });
  const pockets = (pocketsData as { id: string; name: string; color: string | null }[] | null) ?? [];
  const initialKey = sp.pocket ?? (pockets[0]?.id ?? "rekap");

  // Preload all pocket reports for selected month (Opsi A)
  const orderedKeys: (string | null)[] = [...pockets.map((p) => p.id), null];
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevYear = prev.getFullYear();
  const prevMonth = prev.getMonth() + 1;

  const entries = await Promise.all(
    orderedKeys.map(async (pid) => {
      const key = pid ?? "rekap";
      const [selected, list, prevReport] = await Promise.all([
        getMonthlyReport(supabase, rtId, selectedYear, selectedMonth, pid).catch(() => null),
        listMonthlyReports(supabase, rtId, { pocketId: pid, limit: 12 }).catch(() => []),
        getMonthlyReport(supabase, rtId, prevYear, prevMonth, pid).catch(() => null),
      ]);
      const showFailsafe = !prevReport && selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1;
      const data: PocketReportData = { selected, list, prev: prevReport, showFailsafe };
      return [key, data] as const;
    })
  );

  const reportsMap: Record<string, PocketReportData> = Object.fromEntries(entries);

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-background">
        <PocketReportTabs
          pockets={pockets}
          year={selectedYear}
          month={selectedMonth}
          initialKey={initialKey}
          reportsMap={reportsMap}
          rtName={rtName}
          rwNumber={rwNumber}
        />
        <BottomNavSpacer />
      </div>
    </div>
  );
}
