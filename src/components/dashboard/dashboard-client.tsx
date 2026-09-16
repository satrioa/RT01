"use client";

import * as React from "react";
import { HomeWalletCard } from "@/components/dashboard/home-wallet-card";
import { IncomeExpenseBarChart } from "@/components/dashboard/income-expense-bar-chart";
import { OverviewCards } from "@/components/reports/overview-cards";
import type { PocketBalance, RtAppearanceSettings, UserRole } from "@/types/database";

type MonthlyChartPoint = {
  month: string;
  year: number;
  monthNumber: number;
  income: number;
  expense: number;
  pocketId: string | null;
};

export function DashboardClient({
  pockets,
  totalBalance,
  appearance,
  role,
  monthlyChartData,
}: {
  pockets: PocketBalance[];
  totalBalance: number;
  appearance?: RtAppearanceSettings | null;
  role?: UserRole | null;
  monthlyChartData: MonthlyChartPoint[];
}) {
  const [activePocketId, setActivePocketId] = React.useState<string | null>(null);

  const filtered = React.useMemo(() => {
    const f = monthlyChartData.filter((d) => d.pocketId === activePocketId);
    // ensure chronological order
    return [...f].sort((a, b) => (a.year !== b.year ? a.year - b.year : a.monthNumber - b.monthNumber));
  }, [monthlyChartData, activePocketId]);

  const monthLabels = React.useMemo(() => filtered.map((d) => d.month), [filtered]);
  const incomeSeries = React.useMemo(() => filtered.map((d) => d.income), [filtered]);
  const expenseSeries = React.useMemo(() => filtered.map((d) => d.expense), [filtered]);
  const netSeries = React.useMemo(() => filtered.map((d) => d.income - d.expense), [filtered]);

  const currentIncome = incomeSeries[incomeSeries.length - 1] ?? 0;
  const currentExpense = expenseSeries[expenseSeries.length - 1] ?? 0;
  const currentNet = netSeries[netSeries.length - 1] ?? 0;

  const handleActiveIdChange = (id: string) => {
    setActivePocketId(id === "semua" ? null : id);
  };

  const handleBarPocketChange = (id: string | null) => {
    setActivePocketId(id);
  };

  // For HomeWalletCard: activeId is "semua" when null
  const walletActiveId = activePocketId ?? "semua";

  // IncomeExpenseBarChart expects data with {month, income, expense, pocketId}
  const barData = React.useMemo(
    () => monthlyChartData.map(({ month, income, expense, pocketId }) => ({ month, income, expense, pocketId })),
    [monthlyChartData]
  );

  const updatedLabel = React.useMemo(
    () => new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }),
    []
  );

  return (
    <>
      <HomeWalletCard
        pockets={pockets}
        totalBalance={totalBalance}
        appearance={appearance}
        role={role}
        activeId={walletActiveId}
        onActiveIdChange={handleActiveIdChange}
        updatedLabel={updatedLabel}
      />
      <div className="space-y-3">
        <OverviewCards
          incomeSeries={incomeSeries}
          expenseSeries={expenseSeries}
          netSeries={netSeries}
          monthLabels={monthLabels}
          currentIncome={currentIncome}
          currentExpense={currentExpense}
          currentNet={currentNet}
        />
      </div>
      <IncomeExpenseBarChart
        data={barData}
        pockets={pockets.map((p) => ({ id: p.id, name: p.name }))}
        activePocketId={activePocketId}
        onActivePocketChange={handleBarPocketChange}
      />
    </>
  );
}

// Alias for spec compatibility (page.tsx may import DashboardSync)
export const DashboardSync = DashboardClient;
export default DashboardClient;
