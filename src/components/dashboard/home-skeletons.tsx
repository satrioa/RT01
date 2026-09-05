import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function HomeWalletCardSkeleton() {
  return (
    <div className="relative w-full overflow-hidden rounded-4xl border border-border bg-card p-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-4 w-12" />
      </div>
      <div className="mt-8 flex flex-col items-center">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="mt-2 h-9 w-48 rounded-xl" />
        <Skeleton className="mt-2 h-3 w-28" />
      </div>
      <div className="mt-8 flex items-center justify-center gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-2">
            <Skeleton className="size-12 rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function OverviewCardsSkeleton() {
  return (
    <div className="w-full space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-stretch justify-between gap-5 rounded-2xl border bg-white/60 p-5 dark:bg-white/[0.02]">
          <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-[58px] w-[44%] max-w-52 shrink-0 rounded-xl" />
        </div>
      ))}
    </div>
  );
}

export function ExpenseCategoryPieSkeleton() {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Card className="overflow-hidden">
        <CardContent className="flex flex-col items-center gap-2 p-5">
          <Skeleton className="size-[200px] rounded-full" />
          <div className="mt-1 w-full space-y-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="size-2.5 rounded-full" />
                <Skeleton className="h-3 flex-1" />
                <Skeleton className="h-3 w-10" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

export function SmartInputSkeleton() {
  return (
    <div className="rounded-3xl border border-input bg-card p-2">
      <div className="flex items-center gap-1.5 px-1 pb-1">
        <Skeleton className="size-3.5 rounded-full" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-12 w-full rounded-2xl" />
      <div className="flex justify-end px-1 pt-1">
        <Skeleton className="size-8 rounded-full" />
      </div>
    </div>
  );
}
