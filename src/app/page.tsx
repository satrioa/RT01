import { GreetingHeader } from "@/components/dashboard/greeting-header";
import { PocketCarousel } from "@/components/dashboard/pocket-carousel";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { TotalBalanceCard } from "@/components/dashboard/total-balance-card";
import { SmartInput } from "@/components/ai/smart-input";
import { BottomNav, BottomNavSpacer } from "@/components/layout/bottom-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getHomeData } from "@/lib/data/home";
import { AlertTriangle } from "lucide-react";

// Force dynamic so greeting reflects server time and data is fresh
export const dynamic = "force-dynamic";

export default async function Page() {
  const data = await getHomeData();

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

          <QuickActions />

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
