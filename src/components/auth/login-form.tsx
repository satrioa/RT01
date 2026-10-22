"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient, syncAuthToCookies, clearAuthCookies } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, Mail, AlertTriangle } from "lucide-react";

interface LoginFormProps {
  /** Dipanggil setelah sesi tersimpan di cookie. Default: redirect ke dashboard. */
  onSuccess?: () => void;
  /** Tampilkan catatan kecil di bawah form. */
  showHint?: boolean;
}

/**
 * Form login admin (Supabase Auth).
 * Dipakai di /admin/login dan /akun.
 */
export function LoginForm({ onSuccess, showHint = true }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createBrowserClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .maybeSingle();

        const role = (profile as { role?: string } | null)?.role;
        if (role === "viewer") {
          await supabase.auth.signOut();
          clearAuthCookies();
          setError("Akun Anda tidak memiliki akses admin.");
          return;
        }

        syncAuthToCookies(
          data.session as unknown as { access_token: string; refresh_token?: string }
        );

        if (onSuccess) {
          onSuccess();
        } else {
          router.push("/");
          router.refresh();
        }
      }
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-5">
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-xs font-medium text-muted-foreground">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="admin@rtfinance.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9"
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-xs font-medium text-muted-foreground">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9"
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Masuk..." : "Masuk"}
          </Button>

          {showHint && (
            <p className="text-center text-[11px] text-muted-foreground">
              Hanya admin &amp; bendahara yang dapat mengakses halaman ini.
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
