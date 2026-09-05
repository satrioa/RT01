/**
 * Business logic for Telegram — separated from webhook handler.
 */
import { createServiceClient } from "@/lib/supabase/service";
import { formatRupiah } from "@/lib/format";

// We import handleDeterministic which uses DEV_RT_ID; for Telegram we need rt-specific deterministic.
// So we provide rt-aware deterministic handler inline.

export async function getSaldoForPocket(rtId: string, pocketQuery?: string): Promise<string> {
  const supabase = createServiceClient();
  if (!pocketQuery) {
    const { data } = await supabase.from("pocket_balances").select("balance").eq("rt_id", rtId);
    const total = ((data as { balance: string | number }[] | null) ?? []).reduce((s, p) => s + Number(p.balance), 0);
    return `Total saldo RT: ${formatRupiah(total)}`;
  }
  const { data: pb } = await supabase
    .from("pocket_balances")
    .select("name, balance")
    .eq("rt_id", rtId)
    .ilike("name", pocketQuery)
    .maybeSingle();
  if (pb) {
    const row = pb as unknown as { name: string; balance: string | number };
    return `Saldo ${row.name}: ${formatRupiah(Number(row.balance))}`;
  }
  const { data: pockets } = await supabase.from("pockets").select("name").eq("rt_id", rtId).eq("is_active", true);
  const list = ((pockets as { name: string }[] | null)?.map((p) => p.name).join(", ")) ?? "—";
  return `Kantong "${pocketQuery}" tidak ditemukan. Tersedia: ${list}`;
}

export async function getTransaksiSummary(rtId: string, limit = 5): Promise<string> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("transactions")
    .select("amount, type, description, transaction_date, pocket:pockets(name)")
    .eq("rt_id", rtId)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  const rows = (data as unknown as { amount: string; type: string; description: string | null; transaction_date: string; pocket: { name: string } | null }[] | null) ?? [];
  if (rows.length === 0) return "Belum ada transaksi.";
  return rows
    .map((r, i) => {
      const sign = r.type === "income" ? "+" : "-";
      return `${i + 1}. ${r.description ?? r.type} — ${sign}${formatRupiah(Number(r.amount))} (${r.pocket?.name ?? "—"} • ${r.transaction_date})`;
    })
    .join("\n");
}

export async function getRecentTransactionsWithId(
  rtId: string,
  limit = 5
): Promise<
  { id: string; amount: string; type: string; description: string | null; transaction_date: string; pocket_name: string | null; category_name: string | null }[]
> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("transactions")
    .select("id, amount, type, description, transaction_date, pocket:pockets(name), category:categories(name)")
    .eq("rt_id", rtId)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  const rows = (data as unknown as { id: string; amount: string; type: string; description: string | null; transaction_date: string; pocket: { name: string } | null; category: { name: string } | null }[] | null) ?? [];
  return rows.map((r) => ({
    id: r.id,
    amount: r.amount,
    type: r.type,
    description: r.description,
    transaction_date: r.transaction_date,
    pocket_name: r.pocket?.name ?? null,
    category_name: r.category?.name ?? null,
  }));
}

export async function getLaporanSummary(rtId: string): Promise<string> {
  const supabase = createServiceClient();
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  const { data } = await supabase
    .from("transactions")
    .select("amount, type")
    .eq("rt_id", rtId)
    .gte("transaction_date", first)
    .lte("transaction_date", last);
  const rows = (data as { amount: string; type: string }[] | null) ?? [];
  const income = rows.filter((r) => r.type === "income").reduce((s, r) => s + Number(r.amount), 0);
  const expense = rows.filter((r) => r.type === "expense").reduce((s, r) => s + Number(r.amount), 0);
  const net = income - expense;
  // Transfer excluded by not querying transfers
  return [
    `Laporan ${new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(now)}:`,
    `Pemasukan: ${formatRupiah(income)}`,
    `Pengeluaran: ${formatRupiah(expense)}`,
    `Net: ${net >= 0 ? "+" : ""}${formatRupiah(net)}`,
    `Transfer tidak dihitung.`,
  ].join("\n");
}

// Natural language handled in router via rt-aware parseForRt — see src/lib/telegram/router.ts
