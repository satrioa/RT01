import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
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
      className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {pockets.map((p) => (
        <Link
          key={p.id}
          href={`/pockets/${p.id}`}
          role="listitem"
          className="min-w-[148px] shrink-0"
        >
          <Card className="border shadow-none transition-colors hover:border-foreground/10 hover:bg-accent/40">
            <CardContent className="p-4">
              <div className={cn("mb-3 flex size-8 items-center justify-center rounded-xl bg-muted")}>
                <PocketIcon icon={p.icon} />
              </div>
              <p className="truncate text-sm font-semibold">{p.name}</p>
              <p className="truncate text-xs text-muted-foreground">{formatRupiah(Number(p.balance))}</p>
              <p className="mt-1 text-[11px] text-muted-foreground/70">{p.is_active ? "Aktif" : "Arsip"}</p>
            </CardContent>
          </Card>
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
