import { BottomNav, BottomNavSpacer } from "@/components/layout/bottom-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Settings2 } from "lucide-react";

export default function PengaturanPage() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-background">
        <header className="sticky top-0 z-10 border-b bg-card px-5 py-4">
          <h1 className="text-sm font-semibold">Pengaturan</h1>
          <p className="text-xs text-muted-foreground">RT, kantong, kategori</p>
        </header>
        <main className="flex flex-1 flex-col p-5 pb-6">
          <Card className="border-dashed">
            <CardContent className="p-6 text-center">
              <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-muted">
                <Settings2 className="size-5 text-muted-foreground" />
              </div>
              <p className="mt-3 text-sm font-semibold">Pengaturan RT</p>
              <p className="mx-auto mt-1 max-w-[30ch] text-xs leading-relaxed text-muted-foreground">
                Kelola kantong & kategori di fase berikutnya.
              </p>
            </CardContent>
          </Card>
        </main>
        <BottomNavSpacer />
      </div>
      <BottomNav />
    </div>
  );
}
