import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRupiah } from "@/lib/format";

export function CategoryBreakdown({
  title,
  items,
  emptyText,
  accent,
}: {
  title: string;
  items: { categoryId: string | null; categoryName: string; total: number }[];
  emptyText: string;
  accent?: "success" | "destructive";
}) {
  const max = Math.max(...items.map((i) => i.total), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{items.length} kategori • {accent === "success" ? "Pemasukan" : "Pengeluaran"} per kategori</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed bg-muted/30 px-4 py-6 text-center text-xs text-muted-foreground">{emptyText}</p>
        ) : (
          items.map((it) => {
            const pct = Math.round((it.total / max) * 100);
            return (
              <div key={String(it.categoryId ?? it.categoryName)} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{it.categoryName}</span>
                  <span className={`shrink-0 text-sm font-semibold tabular-nums ${accent === "success" ? "text-success" : accent === "destructive" ? "text-destructive" : ""}`}>
                    {formatRupiah(it.total)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className={`h-2 rounded-full transition-all ${accent === "success" ? "bg-success" : "bg-destructive"}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
