import { createServerClient } from "@/lib/supabase/server";
import { hasSupabaseEnv, DEV_RT_ID } from "@/lib/env";
import type { PocketBalance } from "@/types/database";
import type { TxWithMeta } from "./transactions";

export type DateRange = "this_month" | "last_month" | "this_year" | "custom";

export function resolveDateRange(range: DateRange, customFrom?: string, customTo?: string): { from: string; to: string; label: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (range === "custom" && customFrom && customTo) {
    return { from: customFrom, to: customTo, label: `${customFrom} – ${customTo}` };
  }

  if (range === "last_month") {
    const firstThis = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastPrev = new Date(firstThis.getTime() - 24 * 60 * 60 * 1000);
    const firstPrev = new Date(lastPrev.getFullYear(), lastPrev.getMonth(), 1);
    const lastPrevEnd = new Date(firstThis.getTime() - 24 * 60 * 60 * 1000);
    return { from: fmt(firstPrev), to: fmt(lastPrevEnd), label: new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(lastPrev) };
  }

  if (range === "this_year") {
    const first = new Date(now.getFullYear(), 0, 1);
    const last = new Date(now.getFullYear(), 11, 31);
    return { from: fmt(first), to: fmt(last), label: `${now.getFullYear()}` };
  }

  // default this_month
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: fmt(first),
    to: fmt(last),
    label: new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(now),
  };
}

export interface ReportsData {
  from: string;
  to: string;
  rangeLabel: string;
  totalIncome: number;
  totalExpense: number;
  netChange: number;
  currentBalance: number;
  pocketBalances: PocketBalance[];
  expenseByCategory: { categoryId: string | null; categoryName: string; total: number }[];
  incomeByCategory: { categoryId: string | null; categoryName: string; total: number }[];
  transactions: TxWithMeta[];
  error: string | null;
}

export async function getReportsData(opts: { range: DateRange; customFrom?: string; customTo?: string }): Promise<ReportsData> {
  const { from, to, label } = resolveDateRange(opts.range, opts.customFrom, opts.customTo);

  if (!hasSupabaseEnv()) {
    return {
      from,
      to,
      rangeLabel: label,
      totalIncome: 0,
      totalExpense: 0,
      netChange: 0,
      currentBalance: 0,
      pocketBalances: [],
      expenseByCategory: [],
      incomeByCategory: [],
      transactions: [],
      error: "Supabase belum dikonfigurasi. Hubungkan .env untuk laporan real.",
    };
  }

  const supabase = createServerClient();
  const rtId = DEV_RT_ID;

  const [pocketsRes, txRes] = await Promise.all([
    // current balances (unfiltered — ledger derived)
    supabase.from("pocket_balances").select("*").eq("rt_id", rtId).order("sort_order"),
    supabase
      .from("transactions")
      .select("*, pocket:pockets(name), category:categories(name)")
      .eq("rt_id", rtId)
      .gte("transaction_date", from)
      .lte("transaction_date", to)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  // fallback for missing view
  let pocketBalances: PocketBalance[] = (pocketsRes.data as PocketBalance[] | null) ?? [];
  let viewError: string | null = pocketsRes.error?.message ?? null;
  if (pocketsRes.error && String(pocketsRes.error.message).includes("pocket_balances")) {
    const fb = await supabase.from("pockets").select("*").eq("rt_id", rtId).order("sort_order");
    pocketBalances = ((fb.data as unknown as PocketBalance[] | null) ?? []).map((p) => ({ ...p, balance: "0" as unknown as string }));
    viewError = "View pocket_balances belum ada — jalankan migrasi 001.";
  }

  const currentBalance = pocketBalances.reduce((s, p) => s + Number(p.balance ?? 0), 0);

  const txs = (txRes.data as unknown as (TxWithMeta & { pocket: { name: string } | null; category: { name: string } | null })[] | null) ?? [];
  const mapped: TxWithMeta[] = txs.map((t) => ({
    ...t,
    pocket_name: t.pocket?.name ?? undefined,
    category_name: t.category?.name ?? undefined,
  }));

  // Derived — transfers excluded by query (only transactions table)
  const totalIncome = mapped.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = mapped.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const netChange = totalIncome - totalExpense;

  // Group by category
  const group = (type: "income" | "expense") => {
    const map = new Map<string, { name: string; total: number }>();
    for (const t of mapped.filter((x) => x.type === type)) {
      const key = t.category_id ?? "__no_category__";
      const name = t.category_name ?? "Tanpa kategori";
      const cur = map.get(key) ?? { name, total: 0 };
      cur.total += Number(t.amount);
      map.set(key, cur);
    }
    return Array.from(map.entries())
      .map(([categoryId, v]) => ({ categoryId: categoryId === "__no_category__" ? null : categoryId, categoryName: v.name, total: v.total }))
      .sort((a, b) => b.total - a.total);
  };

  const expenseByCategory = group("expense");
  const incomeByCategory = group("income");

  const error = viewError ?? txRes.error?.message ?? null;

  return {
    from,
    to,
    rangeLabel: label,
    totalIncome,
    totalExpense,
    netChange,
    currentBalance,
    pocketBalances,
    expenseByCategory,
    incomeByCategory,
    transactions: mapped,
    error,
  };
}
