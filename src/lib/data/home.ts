import { createServerClient } from "@/lib/supabase/server";
import { hasSupabaseEnv, DEV_RT_ID } from "@/lib/env";
import type { PocketBalance, RtProfile, Transaction, Transfer } from "@/types/database";

export interface HomeData {
  rt: RtProfile | null;
  pockets: PocketBalance[];
  totalBalance: number;
  recentTransactions: (Transaction & { pocket_name?: string; category_name?: string })[];
  recentTransfers: Transfer[];
  error: string | null;
}

/**
 * Single parallel fetch for dashboard — avoids waterfall.
 * Falls back to empty/error states when Supabase env missing or query fails.
 */
export async function getHomeData(): Promise<HomeData> {
  if (!hasSupabaseEnv()) {
    return {
      rt: {
        id: DEV_RT_ID,
        name: "RT 01",
        rt_number: "01",
        rw_number: "07",
        address: null,
        kelurahan: null,
        kecamatan: null,
        city: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      pockets: [],
      totalBalance: 0,
      recentTransactions: [],
      recentTransfers: [],
      error: "Supabase belum dikonfigurasi. Hubungkan .env untuk data real.",
    };
  }

  const supabase = createServerClient();
  const rtId = DEV_RT_ID;

  // Parallel — no waterfall
  const [rtRes, pocketsRes, txRes, trRes] = await Promise.all([
    supabase.from("rt_profiles").select("*").eq("id", rtId).maybeSingle(),
    supabase
      .from("pocket_balances")
      .select("*")
      .eq("rt_id", rtId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("transactions")
      .select("*, pocket:pockets(name), category:categories(name)")
      .eq("rt_id", rtId)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("transfers")
      .select("*")
      .eq("rt_id", rtId)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const rt = (rtRes.data as RtProfile | null) ?? null;

  // pocket_balances returns balance as string|number
  const rawPockets = (pocketsRes.data as PocketBalance[] | null) ?? [];
  const totalBalance = rawPockets.reduce(
    (sum, p) => sum + Number(p.balance ?? 0),
    0
  );

  // Normalize transactions with joined names
  const recentTransactions = (
    (txRes.data as unknown as (Transaction & {
      pocket: { name: string } | null;
      category: { name: string } | null;
    })[] | null) ?? []
  ).map((t) => ({
    ...t,
    pocket_name: t.pocket?.name ?? undefined,
    category_name: t.category?.name ?? undefined,
  }));

  const recentTransfers = (trRes.data as Transfer[] | null) ?? [];

  // Surface first error if any core query failed
  const error =
    (pocketsRes.error?.message as string | undefined) ??
    (txRes.error?.message as string | undefined) ??
    (trRes.error?.message as string | undefined) ??
    null;

  // If pocket_balances view missing (e.g., migrations not applied), fallback to pockets + zero balance
  if (pocketsRes.error && String(pocketsRes.error.message).includes("pocket_balances")) {
    const fallback = await supabase
      .from("pockets")
      .select("*")
      .eq("rt_id", rtId)
      .eq("is_active", true)
      .order("sort_order");
    const fb = (fallback.data as PocketBalance[] | null) ?? [];
    // attach zero balance
    const withZero = fb.map((p) => ({ ...p, balance: "0" as unknown as string }));
    return {
      rt,
      pockets: withZero,
      totalBalance: 0,
      recentTransactions,
      recentTransfers,
      error: "View pocket_balances belum ada — jalankan migrasi 001.",
    };
  }

  return {
    rt,
    pockets: rawPockets,
    totalBalance,
    recentTransactions,
    recentTransfers,
    error,
  };
}
