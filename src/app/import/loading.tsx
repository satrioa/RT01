import { BottomNav, BottomNavSpacer } from "@/components/layout/bottom-nav";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-background">
        <header className="sticky top-0 z-10 border-b bg-card px-5 py-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-1.5 h-3 w-52" />
        </header>
        <main className="flex flex-1 flex-col gap-4 p-5 pb-6">
          <Card className="border-dashed">
            <CardContent className="flex items-center gap-3 p-4">
              <Skeleton className="size-10 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-9 w-28 shrink-0 rounded-xl" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="space-y-1.5 pb-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-56" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-10 w-full rounded-xl" />
              <div className="grid grid-cols-3 gap-2">
                <Skeleton className="h-[68px] rounded-xl" />
                <Skeleton className="h-[68px] rounded-xl" />
                <Skeleton className="h-[68px] rounded-xl" />
              </div>
              <Skeleton className="h-10 w-full rounded-xl" />
            </CardContent>
          </Card>
        </main>
        <BottomNavSpacer />
      </div>
      <BottomNav />
    </div>
  );
}
