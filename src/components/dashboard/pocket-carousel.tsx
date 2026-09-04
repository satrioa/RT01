import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Wallet, Building2, Heart, Calendar, PiggyBank } from "lucide-react";
import type { PocketBalance } from "@/types/database";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  wallet: Wallet,
  building: Building2,
  heart: Heart,
  calendar: Calendar,
};

function PocketIcon({ icon }: { icon: string | null }) {
  const I = (icon && ICON_MAP[icon]) || Wallet;
  return <I className="size-4" />;
}

function PocketGlassCard({ pocket, index }: { pocket: PocketBalance; index: number }) {
  const accent = pocket.color || "#111827";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="h-full"
    >
      <Card className="group relative flex h-[156px] w-full flex-col justify-between overflow-hidden rounded-2xl border-border/50 bg-gradient-to-br from-card/80 via-card/40 to-card/20 p-5 backdrop-blur-md transition-all duration-300 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5">
        {/* Glass wallet background shapes - same as uitripled */}
        <div
          className="absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl transition-all duration-500 group-hover:opacity-80"
          style={{ background: `${accent}18` }}
        />
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-secondary/10 blur-3xl transition-all duration-500 group-hover:bg-secondary/20" />

        <div className="relative flex items-center gap-3">
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-white shadow-sm backdrop-blur-sm"
            style={{ background: accent }}
          >
            <PocketIcon icon={pocket.icon} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight">{pocket.name}</p>
            <p className="truncate text-[11px] text-muted-foreground">{pocket.is_active ? "Aktif" : "Arsip"} • {pocket.icon || "wallet"}</p>
          </div>
        </div>

        <div className="relative">
          <p className="text-[11px] font-medium tracking-widest text-muted-foreground">SALDO</p>
          <p className="truncate text-lg font-bold tracking-tight">{formatRupiah(Number(pocket.balance))}</p>
          {pocket.description && (
            <p className="mt-1 truncate text-xs text-muted-foreground">{pocket.description}</p>
          )}
        </div>

        <div className="absolute inset-0 flex items-center justify-center gap-3 bg-background/60 opacity-0 backdrop-blur-[1px] transition-opacity duration-300 group-hover:opacity-100">
          <span className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-lg">Buka</span>
        </div>
      </Card>
    </motion.div>
  );
}

export function PocketCarousel({ pockets }: { pockets: PocketBalance[] }) {
  if (pockets.length === 0) {
    return (
      <div className="rounded-[20px] border border-dashed bg-card p-6 text-center">
        <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-muted">
          <PiggyBank className="size-5 text-muted-foreground" />
        </div>
        <p className="mt-3 text-sm font-semibold">Belum ada kantong</p>
        <p className="mx-auto mt-1 max-w-[28ch] text-xs leading-relaxed text-muted-foreground">
          Tambahkan kantong Kas, BOP, Sosial atau buat kantong kustom di Pengaturan.
        </p>
        <Link
          href="/pengaturan"
          className="mt-4 inline-flex h-9 items-center justify-center rounded-xl border bg-background px-4 text-sm font-medium"
        >
          Kelola Kantong
        </Link>
      </div>
    );
  }

  return (
    <div
      role="list"
      className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory"
    >
      {pockets.map((p, i) => (
        <Link
          key={p.id}
          href={`/pockets/${p.id}`}
          role="listitem"
          className="w-[220px] min-w-[220px] shrink-0 snap-start"
        >
          <PocketGlassCard pocket={p} index={i} />
        </Link>
      ))}
    </div>
  );
}

export function PocketCarouselSkeleton() {
  return (
    <div className="-mx-5 flex gap-3 px-5">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="min-w-[148px] shrink-0 animate-pulse rounded-[20px] border bg-card p-4">
          <div className="size-8 rounded-xl bg-muted" />
          <div className="mt-3 h-4 w-16 rounded bg-muted" />
          <div className="mt-1 h-3 w-20 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
