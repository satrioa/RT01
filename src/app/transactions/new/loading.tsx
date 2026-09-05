import { BottomNav, BottomNavSpacer } from "@/components/layout/bottom-nav";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-background">
        <header className="flex items-center gap-3 border-b bg-card px-5 py-4">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <Skeleton className="h-4 w-36" />
        </header>
        <main className="flex flex-1 flex-col gap-4 p-5 pb-6">
          <div className="grid grid-cols-2 gap-2 rounded-2xl border bg-card p-1">
            <Skeleton className="h-10 rounded-xl" />
            <Skeleton className="h-10 rounded-xl" />
          </div>
          <Card>
            <CardContent className="space-y-4 p-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-10 w-full rounded-xl" />
                </div>
              ))}
              <Skeleton className="h-11 w-full rounded-xl" />
            </CardContent>
          </Card>
        </main>
        <BottomNavSpacer />
      </div>
      <BottomNav />
    </div>
  );
}
