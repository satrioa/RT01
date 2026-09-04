import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRupiah } from "@/lib/format";
import type { PocketBalance } from "@/types/database";

export function PocketBreakdown({ pockets }: { pockets: PocketBalance[] }) {
  const max = Math.max(...pockets.map((p) => Math.max(Number(p.balance), 0)), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Saldo per kantong</CardTitle>
        <p className="text-xs text-muted-foreground">Derivasi ledger • {pockets.length} kantong</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {pockets.length === 0 ? (
          <p className="rounded-xl border border-dashed bg-muted/30 px-4 py-6 text-center text-xs text-muted-foreground">Belum ada kantong aktif.</p>
        ) : (
          pockets.map((p) => {
            const bal = Number(p.balance);
            const pct = Math.round((Math.max(bal, 0) / max) * 100);
            return (
              <Link key={p.id} href={`/pockets/${p.id}`} className="block space-y-1.5 rounded-xl border bg-card px-3 py-3 hover:bg-accent/40">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold">{p.name}</span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">{formatRupiah(bal)}</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                </div>
                <p className="truncate text-xs text-muted-foreground">{p.description ?? "Kantong RT"} • Saldo saat ini</p>
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
