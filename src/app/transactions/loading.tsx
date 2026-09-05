import { BottomNavSpacer } from "@/components/layout/bottom-nav";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-background">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-card px-5 py-4">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-9 w-28 rounded-xl" />
        </header>
        <main className="flex flex-1 flex-col gap-4 p-5 pb-6">
          <Card>
            <CardContent className="space-y-3 p-4">
              <Skeleton className="h-9 w-full rounded-xl" />
              <div className="flex gap-2">
                <Skeleton className="h-8 flex-1 rounded-full" />
                <Skeleton className="h-8 flex-1 rounded-full" />
                <Skeleton className="h-8 flex-1 rounded-full" />
              </div>
            </CardContent>
          </Card>
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="flex items-center gap-3 p-3">
                  <Skeleton className="size-9 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-4 w-20 shrink-0" />
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
