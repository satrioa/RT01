import { createServerClient } from "@/lib/supabase/server";
import { hasSupabaseEnv, DEV_RT_ID } from "@/lib/env";
import type { Transaction, Pocket, Category } from "@/types/database";

export interface TxFilters {
  pocket?: string;
  type?: "income" | "expense";
  category?: string;
  from?: string;
  to?: string;
  q?: string;
  limit?: number;
}

export interface TxWithMeta extends Transaction {
  pocket_name?: string;
  category_name?: string;
}

export async function getTransactionsFiltered(filters: TxFilters): Promise<{ data: TxWithMeta[]; error: string | null }> {
  if (!hasSupabaseEnv()) return { data: [], error: null };

  const supabase = createServerClient();
  const rtId = DEV_RT_ID;

  let query = supabase
    .from("transactions")
    .select("*, pocket:pockets(name), category:categories(name)")
    .eq("rt_id", rtId)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters.pocket) query = query.eq("pocket_id", filters.pocket);
  if (filters.type) query = query.eq("type", filters.type);
  if (filters.category) query = query.eq("category_id", filters.category);
  if (filters.from) query = query.gte("transaction_date", filters.from);
  if (filters.to) query = query.lte("transaction_date", filters.to);
  if (filters.q) query = query.ilike("description", `%${filters.q}%`);

  if (filters.limit) query = query.limit(filters.limit);
  else query = query.limit(50);

  const { data, error } = await query;
  if (error) return { data: [], error: error.message };

  const mapped = ((data as unknown as (Transaction & { pocket: { name: string } | null; category: { name: string } | null })[]) ?? []).map(
    (t) => ({
      ...t,
      pocket_name: t.pocket?.name ?? undefined,
      category_name: t.category?.name ?? undefined,
    })
  );

  return { data: mapped, error: null };
}

export async function getPocketsAndCategories(): Promise<{ pockets: Pocket[]; categories: Category[]; error: string | null }> {
  if (!hasSupabaseEnv()) return { pockets: [], categories: [], error: null };
  const supabase = createServerClient();
  const rtId = DEV_RT_ID;
  const [pRes, cRes] = await Promise.all([
    supabase.from("pockets").select("*").eq("rt_id", rtId).order("sort_order"),
    supabase.from("categories").select("*").eq("rt_id", rtId).eq("is_active", true).order("name"),
  ]);
  return {
    pockets: (pRes.data as Pocket[] | null) ?? [],
    categories: (cRes.data as Category[] | null) ?? [],
    error: (pRes.error?.message ?? cRes.error?.message ?? null) as string | null,
  };
}

export async function getPocketSummary(pocketId: string): Promise<{
  pocket: (Pocket & { balance: string | number }) | null;
  income: number;
  expense: number;
  transferIn: number;
  transferOut: number;
  error: string | null;
}> {
  if (!hasSupabaseEnv()) return { pocket: null, income: 0, expense: 0, transferIn: 0, transferOut: 0, error: null };
  const supabase = createServerClient();
  const rtId = DEV_RT_ID;

  const [pocketRes, txRes, trRes] = await Promise.all([
    supabase.from("pocket_balances").select("*").eq("id", pocketId).maybeSingle(),
    supabase.from("transactions").select("amount, type").eq("rt_id", rtId).eq("pocket_id", pocketId),
    supabase.from("transfers").select("amount, from_pocket_id, to_pocket_id").eq("rt_id", rtId).or(`from_pocket_id.eq.${pocketId},to_pocket_id.eq.${pocketId}`),
  ]);

  // fallback if view missing / view without gradient columns -> enrich with gradient_* from pockets
  let pocket: (Pocket & { balance: string | number }) | null = pocketRes.data as unknown as Pocket & { balance: string } | null;
  if (pocketRes.error && String(pocketRes.error.message).includes("pocket_balances")) {
    const fb = await supabase.from("pockets").select("*").eq("id", pocketId).maybeSingle();
    pocket = fb.data ? ({ ...(fb.data as Pocket), balance: "0" } as Pocket & { balance: string }) : null;
  } else if (pocket && ((pocket as unknown as { gradient_c1?: string | null }).gradient_c1 === undefined)) {
    // view outdated (migrasi 011 belum recreate) -> ambil gradient dari tabel pockets
    const { data: g } = await supabase.from("pockets").select("gradient_c1, gradient_c3, color").eq("id", pocketId).maybeSingle();
    if (g) {
      (pocket as unknown as Record<string, unknown>).gradient_c1 = (g as { gradient_c1: string | null }).gradient_c1 ?? null;
      (pocket as unknown as Record<string, unknown>).gradient_c3 = (g as { gradient_c3: string | null }).gradient_c3 ?? null;
      // color sudah ada di view, tapi pastikan sinkron
      if ((g as { color: string | null }).color) (pocket as unknown as Record<string, unknown>).color = (g as { color: string | null }).color;
    }
  }

  const income = ((txRes.data as { amount: string; type: string }[] | null) ?? [])
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + Number(t.amount), 0);
  const expense = ((txRes.data as { amount: string; type: string }[] | null) ?? [])
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + Number(t.amount), 0);
  const transferOut = ((trRes.data as { amount: string; from_pocket_id: string }[] | null) ?? [])
    .filter((t) => t.from_pocket_id === pocketId)
    .reduce((s, t) => s + Number(t.amount), 0);
  const transferIn = ((trRes.data as { amount: string; to_pocket_id: string }[] | null) ?? [])
    .filter((t) => (t as unknown as { to_pocket_id: string }).to_pocket_id === pocketId)
    .reduce((s, t) => s + Number(t.amount), 0);

  const err = (pocketRes.error && !String(pocketRes.error.message).includes("pocket_balances") ? pocketRes.error.message : null) ?? null;
  return { pocket, income, expense, transferIn, transferOut, error: err };
}
