"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShaderBackground } from "@/components/motion/shader-background";
import { StatCardData, StatCards } from "@/components/spectrumui/charts/stat-cards";
import { formatRupiah } from "@/lib/format";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

export function TotalBalanceCard({
  total,
  activeCount,
}: {
  total: number;
  activeCount: number;
}) {
  return (
    <Card className="relative overflow-hidden border border-[#d5efd6]/60 text-foreground shadow-lg">
      {/* Light green animated shader background */}
      <ShaderBackground
        variant="mesh-gradient"
        colors={["#e6e6e6", "#ffffff", "#d5efd6", "#f0f8f0", "#e6e6e6"]}
        distortion={0.6}
        swirl={0.35}
        grainMixer={0.08}
        grainOverlay={0.04}
        speed={0.35}
      />
      {/* Light readability overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-[#d5efd6]/20" />
      {/* Subtle green glow */}
      <div className="absolute -top-16 -right-16 size-36 rounded-full bg-[#d5efd6]/40 blur-2xl" />
      <div className="absolute -bottom-12 -left-12 size-32 rounded-full bg-white/60 blur-2xl" />

      <CardHeader className="relative pb-2">
        <div className="text-left">
          <p className="text-sm font-bold text-foreground">Total Saldo</p>
          <p className="text-3xl font-bold tabular-nums mt-1">{formatRupiah(total)}</p>
          <p className="text-xs text-foreground/50 mt-1">Saldo gabungan</p>
        </div>
      </CardHeader>

      <CardContent className="relative flex gap-2 pt-1">
        <Link
          href="/transactions/new?type=income"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-foreground px-3 py-2.5 text-xs font-semibold text-background shadow-sm transition-colors hover:bg-foreground/90 active:bg-foreground/80"
        >
          <ArrowUpRight className="size-3.5" /> Pemasukan
        </Link>
        <Link
          href="/transactions/new?type=expense"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-white px-3 py-2.5 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-white/90 active:bg-white/80 border border-foreground/10"
        >
          <ArrowDownRight className="size-3.5" /> Pengeluaran
        </Link>
      </CardContent>
    </Card>
  );
}

export function TotalBalanceCardSkeleton() {
  return (
    <div className="animate-pulse rounded-[20px] bg-muted p-6">
      <div className="h-4 w-24 rounded bg-muted-foreground/20" />
      <div className="mt-3 h-8 w-48 rounded bg-muted-foreground/20" />
      <div className="mt-2 h-3 w-32 rounded bg-muted-foreground/10" />
    </div>
  );
}
