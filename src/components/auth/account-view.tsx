"use client";

import { useRouter } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { AccountPanel } from "@/components/auth/account-panel";
import { Lock } from "lucide-react";
import type { AuthProfile } from "@/types";

/**
 * Isi halaman /akun:
 * - belum login → form login
 * - sudah login → panel akun + tombol keluar
 */
export function AccountView({ profile }: { profile: AuthProfile | null }) {
  const router = useRouter();

  if (!profile) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 rounded-2xl border bg-card p-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Lock className="size-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Masuk sebagai admin</p>
            <p className="text-[11px] text-muted-foreground">
              Login untuk membuka menu Tambah, Pengaturan, dan laporan.
            </p>
          </div>
        </div>

        <LoginForm
          showHint={false}
          onSuccess={() => {
            // Cookie sudah tersimpan → re-render server component:
            // halaman ini berganti ke panel akun dan menu admin muncul di dock.
            router.refresh();
          }}
        />
      </div>
    );
  }

  return <AccountPanel profile={profile} />;
}
