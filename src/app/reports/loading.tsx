import { BottomNavSpacer } from "@/components/layout/bottom-nav";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-background">
        <header className="sticky top-0 z-10 border-b bg-card px-5 py-4">
          <div className="flex items-center gap-2">
            <Skeleton className="size-8 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-6 p-5 pb-6">
          <div className="flex gap-1.5 overflow-hidden">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-9 w-24 shrink-0 rounded-full" />
            ))}
          </div>
          <Card>
            <CardContent className="flex items-center gap-2 p-3">
              <Skeleton className="size-4 rounded-full" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
          <div className="space-y-3">
            <Skeleton className="mx-1 h-4 w-48" />
            <Card className="overflow-hidden">
              <CardContent className="space-y-3 p-5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-44 rounded-xl" />
                <div className="grid grid-cols-2 gap-3">
                  <Skeleton className="h-[68px] rounded-xl" />
                  <Skeleton className="h-[68px] rounded-xl" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-10 flex-1 rounded-xl" />
                  <Skeleton className="h-10 flex-1 rounded-xl" />
                  <Skeleton className="h-10 flex-1 rounded-xl" />
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Card key={i}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-44" />
                    </div>
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
        <BottomNavSpacer />
      </div>
    </div>
  );
}
