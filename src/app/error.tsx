"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-background p-5">
        <Card className="mt-12 border-destructive/30">
          <CardContent className="p-6 text-center">
            <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <AlertTriangle className="size-5" />
            </div>
            <p className="mt-3 text-sm font-semibold">Gagal memuat dashboard</p>
            <p className="mx-auto mt-1 max-w-[32ch] text-xs leading-relaxed text-muted-foreground">
              {error.message || "Terjadi kesalahan. Coba muat ulang."}
            </p>
            <Button onClick={reset} className="mt-4" size="sm">
              Coba lagi
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
