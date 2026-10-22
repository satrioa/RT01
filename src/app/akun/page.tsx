import { AccountView } from "@/components/auth/account-view";
import { BottomNavSpacer } from "@/components/layout/bottom-nav";
import { getCurrentUserProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AkunPage() {
  const profile = await getCurrentUserProfile();

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-background">
        <header className="sticky top-0 z-10 border-b bg-card px-5 py-4">
          <h1 className="text-sm font-semibold">Akun</h1>
          <p className="text-xs text-muted-foreground">
            {profile ? "Kelola akun admin" : "Masuk untuk membuka menu admin"}
          </p>
        </header>
        <main className="flex flex-1 flex-col gap-3 p-4 pb-6">
          <AccountView profile={profile} />
        </main>
        <BottomNavSpacer />
      </div>
    </div>
  );
}
