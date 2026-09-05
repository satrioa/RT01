"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import Grainient from "@/components/motion/grainient";
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
    <Card className="relative overflow-hidden border-0 text-white shadow-lg">
      {/* Grainient — React Bits (ogl) */}
      <div className="absolute inset-0">
        <Grainient
          color1="#003612"
          color2="#84CC16"
          color3="#001d01"
          timeSpeed={0.25}
          colorBalance={0.0}
          warpStrength={1.0}
          warpFrequency={5.0}
          warpSpeed={2.0}
          warpAmplitude={50.0}
          blendAngle={0.0}
          blendSoftness={0.05}
          rotationAmount={500.0}
          noiseScale={2.0}
          grainAmount={0.1}
          grainScale={2.0}
          grainAnimated={false}
          contrast={1.5}
          gamma={1.0}
          saturation={1.0}
          centerX={0.0}
          centerY={0.0}
          zoom={0.9}
        />
      </div>
      {/* Readability overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-black/10 to-black/25" />
      <div className="absolute -top-16 -right-16 size-36 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-12 -left-12 size-32 rounded-full bg-black/10 blur-2xl" />

      <CardHeader className="relative pb-2">
        <div className="text-left">
          <p className="text-sm font-bold text-white">Total Saldo</p>
          <p className="text-3xl font-bold tabular-nums mt-1 text-white">{formatRupiah(total)}</p>
          <p className="text-xs text-white/70 mt-1">{activeCount} kantong • Saldo gabungan</p>
        </div>
      </CardHeader>

      <CardContent className="relative flex gap-2 pt-1">
        <Link
          href="/transactions/new?type=income"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-white px-3 py-2.5 text-xs font-semibold text-[#1a4d1a] shadow-sm transition-colors hover:bg-white/90 active:bg-white/80"
        >
          <ArrowUpRight className="size-3.5" /> Pemasukan
        </Link>
        <Link
          href="/transactions/new?type=expense"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-white/15 px-3 py-2.5 text-xs font-semibold text-white shadow-sm backdrop-blur-sm transition-colors hover:bg-white/20 active:bg-white/25 border border-white/20"
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
