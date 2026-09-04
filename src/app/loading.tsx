import { GreetingHeaderSkeleton } from "@/components/dashboard/greeting-header";
import { PocketCarouselSkeleton } from "@/components/dashboard/pocket-carousel";
import { RecentTransactionsSkeleton } from "@/components/dashboard/recent-transactions";
import { TotalBalanceCardSkeleton } from "@/components/dashboard/total-balance-card";
import { BottomNavSpacer } from "@/components/layout/bottom-nav";
import { Separator } from "@/components/ui/separator";

export default function Loading() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-background">
        <div className="flex flex-1 flex-col gap-6 p-5 pb-24">
          <GreetingHeaderSkeleton />
          <TotalBalanceCardSkeleton />
          <section className="space-y-3">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <PocketCarouselSkeleton />
          </section>
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[88px] animate-pulse rounded-[20px] border bg-card" />
            ))}
          </div>
          <Separator />
          <RecentTransactionsSkeleton />
        </div>
        <BottomNavSpacer />
      </div>
    </div>
  );
}
