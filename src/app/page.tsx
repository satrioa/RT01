import { GreetingHeader } from "@/components/dashboard/greeting-header";
import { PocketCarousel } from "@/components/dashboard/pocket-carousel";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { TotalBalanceCard } from "@/components/dashboard/total-balance-card";
import { CashFlowGauge } from "@/components/dashboard/cash-flow-gauge";
import { OverviewCards } from "@/components/reports/overview-cards";
import { SmartInput } from "@/components/ai/smart-input";
import { BottomNav, BottomNavSpacer } from "@/components/layout/bottom-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getHomeData } from "@/lib/data/home";
import { createServiceClient } from "@/lib/supabase/service";
import { hasSupabaseEnv, DEV_RT_ID } from "@/lib/env";
import { AlertTriangle } from "lucide-react";

// Force dynamic so greeting reflects server time and data is fresh
export const dynamic = "force-dynamic";

export default async function Page() {
  const data = await getHomeData();

  // Fetch income/expense for current month directly from DB
  let totalIncome = 0;
  let totalExpense = 0;
  if (hasSupabaseEnv()) {
    const supabase = createServiceClient();
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const [incRes, expRes] = await Promise.all([
      supabase.from("transactions").select("amount").eq("rt_id", DEV_RT_ID).eq("type", "income").gte("transaction_date", start),
      supabase.from("transactions").select("amount").eq("rt_id", DEV_RT_ID).eq("type", "expense").gte("transaction_date", start),
    ]);
    totalIncome = (incRes.data ?? []).reduce((s: number, r: { amount: string }) => s + Number(r.amount), 0);
    totalExpense = (expRes.data ?? []).reduce((s: number, r: { amount: string }) => s + Number(r.amount), 0);
  }

  const rtName = data.rt?.name ?? "RT 01";
  const rtNumber = data.rt?.rt_number ?? "01";
  const rwNumber = data.rt?.rw_number ?? "01";

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-background">
        <main className="flex flex-1 flex-col gap-6 p-5 pb-6">
          <GreetingHeader rtName={rtName} rtNumber={rtNumber} rwNumber={rwNumber} />

          {data.error && (
            <Card className="border-warning/30 bg-warning/5">
              <CardContent className="flex gap-3 p-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning">
                  <AlertTriangle className="size-4" />
                </span>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {data.error}
                </p>
              </CardContent>
            </Card>
          )}

          <TotalBalanceCard total={data.totalBalance} activeCount={data.pockets.length} />

          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold">Kantong</h2>
              <span className="text-xs text-muted-foreground">{data.pockets.length} aktif</span>
            </div>
            <PocketCarousel pockets={data.pockets} />
          </section>

          {/* KPI & Gauge */}
          <div className="space-y-3">
            <OverviewCards
              totalIncome={totalIncome}
              totalExpense={totalExpense}
              netChange={totalIncome - totalExpense}
            />
            <CashFlowGauge totalIncome={totalIncome} totalExpense={totalExpense} />
          </div>

          <SmartInput />

          <Separator />

          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold">Transaksi terbaru</h2>
              <span className="text-xs text-muted-foreground">5 terbaru</span>
            </div>
            <RecentTransactions transactions={data.recentTransactions} transfers={data.recentTransfers} />
          </section>
        </main>

        <BottomNavSpacer />
      </div>

      <BottomNav />
    </div>
  );
}