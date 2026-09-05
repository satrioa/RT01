import { BottomNavSpacer } from "@/components/layout/bottom-nav";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-background">
        <header className="sticky top-0 z-10 border-b bg-card px-5 py-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-1.5 h-3 w-44" />
        </header>
        <main className="flex flex-1 flex-col gap-3 p-4 pb-6">
          <Skeleton className="mx-1 h-3 w-16" />
          <div className="grid gap-2">
            {[0, 1].map((i) => (
              <Card key={i} className="overflow-hidden">
                <div className="flex w-full items-center gap-3 p-3">
                  <Skeleton className="size-9 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-3 w-44" />
                  </div>
                  <Skeleton className="size-4 shrink-0 rounded-full" />
                </div>
              </Card>
            ))}
          </div>
          <Skeleton className="mx-1 mt-1 h-3 w-24" />
          <div className="grid gap-2">
            {[0, 1, 2].map((i) => (
              <Card key={i} className="overflow-hidden">
                <div className="flex w-full items-center gap-3 p-3">
                  <Skeleton className="size-9 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                  <Skeleton className="size-4 shrink-0 rounded-full" />
                </div>
              </Card>
            ))}
          </div>
        </main>
        <BottomNavSpacer />
      </div>
    </div>
  );
}
