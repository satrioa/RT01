import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShaderBackground } from "@/components/motion/shader-background";
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
      {/* Animated shader background */}
      <div className="absolute inset-0">
        <ShaderBackground
          variant="mesh-gradient"
          colors={["#0f172a", "#1e3a5f", "#0e7490", "#14532d", "#1a1a2e"]}
          distortion={0.7}
          swirl={0.5}
          grainMixer={0.15}
          grainOverlay={0.08}
          speed={0.4}
        />
      </div>
      {/* Readability overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/35 via-black/15 to-black/40" />
      {/* Subtle inner glow */}
      <div className="absolute -top-24 -right-24 size-48 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-20 -left-20 size-40 rounded-full bg-white/5 blur-3xl" />

      <CardHeader className="relative pb-2">
        <CardDescription className="text-white/70">Total Saldo</CardDescription>
        <CardTitle className="text-[28px] font-bold tracking-tight text-white sm:text-3xl">
          {formatRupiah(total)}
        </CardTitle>
        <p className="text-xs text-white/60">
          {activeCount} kantong aktif • saldo gabungan
        </p>
      </CardHeader>
      <CardContent className="relative flex gap-2 pt-1">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
          <ArrowUpRight className="size-3.5" /> Pemasukan
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
          <ArrowDownRight className="size-3.5" /> Pengeluaran
        </span>
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
