"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient, clearAuthCookies } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toaster";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, ShieldCheck, Mail, Wallet, Loader2 } from "lucide-react";
import type { AuthProfile } from "@/types";

const ROLE_LABEL: Record<AuthProfile["role"], string> = {
  admin: "Admin",
  bendahara: "Bendahara",
  viewer: "Viewer",
};

export function AccountPanel({ profile }: { profile: AuthProfile }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const canManage = profile.role === "admin" || profile.role === "bendahara";
  const initial = (profile.name || profile.email || "A").trim().charAt(0).toUpperCase();

  async function handleLogout() {
    setLoading(true);
    try {
      const supabase = createBrowserClient();
      await supabase.auth.signOut();
      clearAuthCookies();
      toast({ title: "Berhasil keluar", description: "Sesi admin dihentikan." });
      router.refresh();
    } catch {
      toast({ title: "Gagal keluar", description: "Coba lagi.", variant: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-lg font-bold text-primary">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{profile.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {profile.email ?? "Email tidak tersedia"}
              </p>
            </div>
            <Badge variant={canManage ? "default" : "outline"} className="shrink-0">
              <ShieldCheck className="mr-1 size-3" />
              {ROLE_LABEL[profile.role]}
            </Badge>
          </div>

          <div className="mt-4 space-y-2 rounded-xl bg-muted/40 p-3 text-xs">
            <div className="flex items-center gap-2">
              <Mail className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">Login via</span>
              <span className="ml-auto font-medium">Supabase Auth</span>
            </div>
            <div className="flex items-center gap-2">
              <Wallet className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">RT ID</span>
              <span className="ml-auto max-w-[60%] truncate font-mono text-[10px]">
                {profile.rtId ?? "—"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 p-3">
          {canManage && (
            <Button asChild variant="ghost" className="w-full justify-start rounded-xl">
              <Link href="/pengaturan">
                <Settings className="size-4" />
                Pengaturan RT
                <span className="ml-auto text-[11px] text-muted-foreground">Kantong, AI, Telegram</span>
              </Link>
            </Button>
          )}

          <Button
            variant="outline"
            className="w-full justify-start rounded-xl text-destructive hover:bg-destructive/5 hover:text-destructive"
            onClick={handleLogout}
            disabled={loading}
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
            {loading ? "Keluar..." : "Keluar"}
          </Button>
        </CardContent>
      </Card>

      <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">
        Sesi berlaku 7 hari. Setelah keluar, menu admin disembunyikan dan halaman ini kembali
        menampilkan form login.
      </p>
    </div>
  );
}
