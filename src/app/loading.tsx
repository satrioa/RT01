import { GreetingHeaderSkeleton } from "@/components/dashboard/greeting-header";
import { RecentTransactionsSkeleton } from "@/components/dashboard/recent-transactions";
import {
  ExpenseCategoryPieSkeleton,
  HomeWalletCardSkeleton,
  OverviewCardsSkeleton,
  SmartInputSkeleton,
} from "@/components/dashboard/home-skeletons";
import { BottomNavSpacer } from "@/components/layout/bottom-nav";
import { Separator } from "@/components/ui/separator";

export default function Loading() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-background">
        <main className="flex flex-1 flex-col gap-6 px-5 pt-5">
          <GreetingHeaderSkeleton />
          <HomeWalletCardSkeleton />
          <OverviewCardsSkeleton />
          <ExpenseCategoryPieSkeleton />
          <SmartInputSkeleton />
          <Separator />
          <section className="relative left-1/2 w-screen flex-1 -translate-x-1/2 bg-white dark:bg-zinc-900">
            <div className="mx-auto w-full max-w-[430px] space-y-3 px-5 py-6">
              <div className="flex items-center justify-between px-1">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-3 w-16 animate-pulse rounded bg-muted" />
              </div>
              <RecentTransactionsSkeleton />
            </div>
            <BottomNavSpacer />
          </section>
        </main>
      </div>
    </div>
  );
}
