"use client";

import { LoginForm } from "@/components/auth/login-form";
import { Lock } from "lucide-react";

export default function AdminLoginPage() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col items-center justify-center bg-background px-5">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10">
              <Lock className="size-6 text-primary" />
            </div>
            <h1 className="text-lg font-bold">Admin Login</h1>
            <p className="text-xs text-muted-foreground">
              Masuk untuk mengelola data keuangan RT
            </p>
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  );
}
