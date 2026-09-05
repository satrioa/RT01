import { BottomNav, BottomNavSpacer } from "@/components/layout/bottom-nav";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-background">
        <header className="flex items-center gap-3 border-b bg-card px-5 py-4">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </header>
        <main className="flex flex-1 flex-col gap-4 p-5 pb-6">
          <Card className="overflow-hidden">
            <CardContent className="space-y-3 p-5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-44 rounded-xl" />
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-[64px] rounded-xl" />
                <Skeleton className="h-[64px] rounded-xl" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex gap-2 p-3">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-8 flex-1 rounded-full" />
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-40" />
            </CardHeader>
            <CardContent className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border px-3 py-2">
                  <Skeleton className="size-9 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-4 w-16 shrink-0" />
                </div>
              ))}
            </CardContent>
          </Card>
        </main>
        <BottomNavSpacer />
      </div>
      <BottomNav />
    </div>
  );
}
