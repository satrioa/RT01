import { GreetingHeader } from "@/components/dashboard/greeting-header";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { OverviewCards } from "@/components/reports/overview-cards";
import { SmartInput } from "@/components/ai/smart-input";
import { BottomNav, BottomNavSpacer } from "@/components/layout/bottom-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getHomeData } from "@/lib/data/home";
import { createServiceClient } from "@/lib/supabase/service";
import { hasSupabaseEnv, DEV_RT_ID } from "@/lib/env";
import { AlertTriangle } from "lucide-react";
import { HomeWalletCard } from "@/components/dashboard/home-wallet-card";
import { ExpenseCategoryPie } from "@/components/dashboard/expense-category-pie";
import { getAppearanceSettings } from "@/lib/actions/appearance";

// Force dynamic so greeting reflects server time and data is fresh
export const dynamic = "force-dynamic";

export default async function Page() {
  const [data, appearance] = await Promise.all([getHomeData(), getAppearanceSettings().catch(() => null)]);

  // Fetch income/expense for current month directly from DB
  let totalIncome = 0;
  let totalExpense = 0;
  let expenseByCategory: { label: string; value: number }[] = [];
  if (hasSupabaseEnv()) {
    const supabase = createServiceClient();
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const [incRes, expRes, expCatRes] = await Promise.all([
      supabase.from("transactions").select("amount").eq("rt_id", DEV_RT_ID).eq("type", "income").gte("transaction_date", start),
      supabase.from("transactions").select("amount").eq("rt_id", DEV_RT_ID).eq("type", "expense").gte("transaction_date", start),
      supabase.from("transactions").select("amount, category:categories(name)").eq("rt_id", DEV_RT_ID).eq("type", "expense").gte("transaction_date", start).limit(2000),
    ]);
    totalIncome = (incRes.data ?? []).reduce((s: number, r: { amount: string }) => s + Number(r.amount), 0);
    totalExpense = (expRes.data ?? []).reduce((s: number, r: { amount: string }) => s + Number(r.amount), 0);
    const byCat = new Map<string, number>();
    for (const r of ((expCatRes.data as unknown as { amount: string; category: { name: string } | null }[] | null) ?? [])) {
      const label = r.category?.name ?? "Tanpa kategori";
      byCat.set(label, (byCat.get(label) ?? 0) + Number(r.amount));
    }
    expenseByCategory = Array.from(byCat.entries())
      .map(([label, value]) => ({ label, value }))
      .filter((i) => i.value > 0)
      .sort((a, b) => b.value - a.value);
  }
  const expenseMonthLabel = new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  const rtName = data.rt?.name ?? "RT 01";
  const rtNumber = data.rt?.rt_number ?? "01";
  const rwNumber = data.rt?.rw_number ?? "07";

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-background">
        <main className="flex flex-1 flex-col gap-6 px-5 pt-5">
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

          {/* Wallet — ganti pilihan kantong: Semua / Kas / BOP */}
          <HomeWalletCard pockets={data.pockets} totalBalance={data.totalBalance} appearance={appearance} />

          {/* KPI */}
          <div className="space-y-3">
            <OverviewCards
              totalIncome={totalIncome}
              totalExpense={totalExpense}
              netChange={totalIncome - totalExpense}
            />
          </div>

          <ExpenseCategoryPie items={expenseByCategory} monthLabel={expenseMonthLabel} />

          <SmartInput />

          <Separator />

          {/* Transaksi terbaru — background putih full viewport sampai bottom mentok */}
          <section className="relative left-1/2 w-screen flex-1 -translate-x-1/2 bg-white dark:bg-zinc-900">
            <div className="mx-auto w-full max-w-[430px] space-y-3 px-5 py-6">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold">Transaksi terbaru</h2>
                <span className="text-xs text-muted-foreground">5 terbaru</span>
              </div>
              <RecentTransactions transactions={data.recentTransactions} transfers={data.recentTransfers} />
            </div>
            <BottomNavSpacer />
          </section>
        </main>
      </div>

      <BottomNav />
    </div>
  );
}