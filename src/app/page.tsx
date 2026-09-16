import { GreetingHeader } from "@/components/dashboard/greeting-header";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { OverviewCards } from "@/components/reports/overview-cards";
import { SmartInput } from "@/components/ai/smart-input";
import { BottomNavSpacer } from "@/components/layout/bottom-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getHomeData } from "@/lib/data/home";
import { createServiceClient } from "@/lib/supabase/service";
import { hasSupabaseEnv, DEV_RT_ID } from "@/lib/env";
import { AlertTriangle } from "lucide-react";
import { HomeWalletCard } from "@/components/dashboard/home-wallet-card";
import { ExpenseCategoryPie } from "@/components/dashboard/expense-category-pie";
import { getAppearanceSettings } from "@/lib/actions/appearance";
import { IncomeExpenseBarChart } from "@/components/dashboard/income-expense-bar-chart";
import { getCurrentUserRole } from "@/lib/auth";

// Force dynamic so greeting reflects server time and data is fresh
export const dynamic = "force-dynamic";

export default async function Page() {
  const [data, appearance, role] = await Promise.all([getHomeData(), getAppearanceSettings().catch(() => null), getCurrentUserRole()]);

  // Fetch income/expense for current month directly from DB
  let totalIncome = 0;
  let totalExpense = 0;
  let expenseByCategory: { label: string; value: number }[] = [];
  const now = new Date();
  const monthlyChartData = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    const base = {
      month: date.toLocaleDateString("id-ID", { month: "short" }).replace(".", ""),
      year: date.getFullYear(),
      monthNumber: date.getMonth(),
      income: 0,
      expense: 0,
    };
    return [
      { ...base, pocketId: null as string | null },
      ...data.pockets.map((pocket) => ({ ...base, pocketId: pocket.id })),
    ];
  }).flat();
  if (hasSupabaseEnv()) {
    const supabase = createServiceClient();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const chartStart = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();
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

    const chartRes = await supabase
      .from("transactions")
      .select("amount, type, transaction_date, pocket_id")
      .eq("rt_id", DEV_RT_ID)
      .gte("transaction_date", chartStart)
      .limit(5000);
    for (const row of (chartRes.data ?? []) as { amount: string; type: "income" | "expense"; transaction_date: string; pocket_id: string }[]) {
      const date = new Date(`${row.transaction_date}T00:00:00`);
      const points = monthlyChartData.filter(
        (item) => item.year === date.getFullYear() && item.monthNumber === date.getMonth() && (item.pocketId === null || item.pocketId === row.pocket_id)
      );
      for (const point of points) point[row.type] += Number(row.amount);
    }
  }
  const expenseMonthLabel = new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  const rtName = data.rt?.name ?? "RT 01";
  const rtNumber = data.rt?.rt_number ?? "01";
  const rwNumber = data.rt?.rw_number ?? "07";

  return (
    <div className="min-h-dvh overflow-x-clip bg-background">
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

          <IncomeExpenseBarChart data={monthlyChartData.map(({ month, income, expense, pocketId }) => ({ month, income, expense, pocketId }))} pockets={data.pockets.map((pocket) => ({ id: pocket.id, name: pocket.name }))} />

          <ExpenseCategoryPie items={expenseByCategory} monthLabel={expenseMonthLabel} />

          {(role === "admin" || role === "bendahara") && <SmartInput />}

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
    </div>
  );
}
