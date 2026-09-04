import { createServerClient } from "@/lib/supabase/server";
import { DEV_RT_ID, hasSupabaseEnv } from "@/lib/env";
import { formatRupiah } from "@/lib/format";

/**
 * Cost optimization: handle simple deterministic queries without AI.
 * Returns null if not deterministic (caller should use AI).
 */
export async function handleDeterministic(
  input: string
): Promise<{ handled: true; answer: string; pocket?: string } | { handled: false }> {
  const raw = input.trim().toLowerCase();

  // Patterns: "saldo kas", "saldo bop", "cek saldo sosial", "saldo kegiatan berapa"
  const saldoMatch = raw.match(/^(?:cek\s+)?saldo\s+([a-z0-9\s&]+?)(?:\s+berapa)?$/i);
  if (saldoMatch) {
    const pocketQuery = saldoMatch[1].trim();
    if (!hasSupabaseEnv()) {
      return { handled: true, answer: `Saldo ${pocketQuery}: data belum terhubung (Supabase belum dikonfigurasi).`, pocket: pocketQuery };
    }
    const supabase = createServerClient();
    const rtId = DEV_RT_ID;
    // Try pocket_balances first, fallback to pockets
    const { data: pb } = await supabase
      .from("pocket_balances")
      .select("name, balance")
      .eq("rt_id", rtId)
      .ilike("name", pocketQuery)
      .maybeSingle();

    if (pb) {
      const bal = pb as unknown as { name: string; balance: string | number };
      return { handled: true, answer: `Saldo ${bal.name}: ${formatRupiah(Number(bal.balance))}`, pocket: bal.name };
    }

    // Fallback: list pockets and fuzzy
    const { data: pockets } = await supabase.from("pockets").select("name").eq("rt_id", rtId).eq("is_active", true);
    const list = (pockets as { name: string }[] | null)?.map((p) => p.name).join(", ") ?? "—";
    return { handled: true, answer: `Kantong "${pocketQuery}" tidak ditemukan. Kantong tersedia: ${list}` };
  }

  // "saldo" alone — total
  if (/^(?:cek\s+)?saldo(?:\s+rt)?(?:\s+total)?$/.test(raw)) {
    if (!hasSupabaseEnv()) return { handled: true, answer: "Total saldo belum tersedia (Supabase belum dikonfigurasi)." };
    const supabase = createServerClient();
    const rtId = DEV_RT_ID;
    const { data } = await supabase.from("pocket_balances").select("balance").eq("rt_id", rtId);
    const total = ((data as { balance: string | number }[] | null) ?? []).reduce((s, p) => s + Number(p.balance), 0);
    return { handled: true, answer: `Total saldo RT: ${formatRupiah(total)}` };
  }

  // "transaksi bulan ini", "transaksi hari ini" — simple stats, no AI
  if (/^transaksi\s+(bulan|hari)\s+ini$/.test(raw) || raw === "transaksi bulan ini" || raw === "transaksi hari ini") {
    return { handled: true, answer: `Untuk melihat transaksi ${raw.includes("hari") ? "hari ini" : "bulan ini"}, buka Transaksi dan gunakan filter tanggal.` };
  }

  return { handled: false };
}
