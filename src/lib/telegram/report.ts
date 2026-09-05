import { createServiceClient } from "@/lib/supabase/service";
import { calculatePocketMonthlySnapshot, getMonthPeriod } from "@/lib/reports/monthly-report-calculator";
import { generateMonthlyPdf } from "@/lib/reports/pdf-generator";
import { formatRupiah } from "@/lib/format";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const MONTH_FULL = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export function getMonthLabel(month: number): string {
  return MONTH_FULL[month - 1] ?? String(month);
}

export async function findPocketIdForReportType(rtId: string, type: "kas" | "bop"): Promise<{ id: string; name: string } | null> {
  const supabase = createServiceClient();
  const target = type === "kas" ? "Kas" : "BOP";
  // try exact, then ilike
  const { data: exact } = await supabase.from("pockets").select("id, name").eq("rt_id", rtId).ilike("name", target).maybeSingle();
  if (exact) return exact as { id: string; name: string };
  // fallback: find by name contains
  const { data: all } = await supabase.from("pockets").select("id, name").eq("rt_id", rtId);
  const list = (all as { id: string; name: string }[] | null) ?? [];
  const found = list.find((p) => p.name.toLowerCase() === target.toLowerCase());
  if (found) return found;
  // fallback for BOP: also check "BOP" alias, Kas alias
  const alias = list.find((p) => p.name.toLowerCase().includes(target.toLowerCase()));
  return alias ?? null;
}

export async function generateKasBopReportPdf(
  rtId: string,
  type: "kas" | "bop",
  year: number,
  month: number
): Promise<{ buffer: Buffer; filename: string; caption: string; totals: { income: number; expense: number; net: number; count: number } }> {
  if (month < 1 || month > 12) throw new Error("Bulan tidak valid (1-12)");
  if (year < 2000 || year > 2100) throw new Error("Tahun tidak valid");

  const supabase = createServiceClient();
  const pocketInfo = await findPocketIdForReportType(rtId, type);
  if (!pocketInfo) throw new Error(`Kantong ${type.toUpperCase()} tidak ditemukan. Pastikan kantong "${type === "kas" ? "Kas" : "BOP"}" ada.`);

  const { period_start, period_end } = getMonthPeriod(year, month);

  // snapshot via existing calculator (reuses opening_balance, transfer logic)
  let snapshot: Awaited<ReturnType<typeof calculatePocketMonthlySnapshot>>;
  try {
    snapshot = await calculatePocketMonthlySnapshot(supabase, rtId, pocketInfo.id, year, month);
  } catch (e) {
    throw new Error(`Gagal hitung snapshot: ${e instanceof Error ? e.message : String(e)}`);
  }

  const { data: rtProfile } = await supabase.from("rt_profiles").select("name, rt_number, rw_number").eq("id", rtId).maybeSingle();
  const rtName = (rtProfile as { name?: string } | null)?.name ?? "RT";
  const rtNumber = (rtProfile as { rt_number?: string } | null)?.rt_number ?? "01";
  const rwNumber = (rtProfile as { rw_number?: string } | null)?.rw_number ?? "07";

  // fetch transactions for this pocket+period
  const { data: txsRaw } = await supabase
    .from("transactions")
    .select("id, transaction_date, description, type, amount, pocket:pockets(name), category:categories(name)")
    .eq("rt_id", rtId)
    .eq("pocket_id", pocketInfo.id)
    .gte("transaction_date", period_start)
    .lte("transaction_date", period_end)
    .order("transaction_date", { ascending: true })
    .order("created_at", { ascending: true });

  const txRows = (txsRaw as unknown as { id: string; transaction_date: string; description: string | null; type: string; amount: string; pocket: { name: string } | null; category: { name: string } | null }[] | null) ?? [];

  // transfers for this pocket
  const { data: trRaw } = await supabase
    .from("transfers")
    .select("id, transaction_date, description, amount, from_pocket:pockets!transfers_from_pocket_id_fkey(name), to_pocket:pockets!transfers_to_pocket_id_fkey(name), from_pocket_id, to_pocket_id")
    .eq("rt_id", rtId)
    .gte("transaction_date", period_start)
    .lte("transaction_date", period_end)
    .order("transaction_date", { ascending: true });
  let trRowsRaw = (trRaw as unknown as { id: string; transaction_date: string; description: string | null; amount: string; from_pocket: { name: string } | null; to_pocket: { name: string } | null; from_pocket_id: string; to_pocket_id: string }[] | null) ?? [];
  trRowsRaw = trRowsRaw.filter((tr) => tr.from_pocket_id === pocketInfo.id || tr.to_pocket_id === pocketInfo.id);

  const buffer = await generateMonthlyPdf({
    rtName,
    rtNumber,
    rwNumber,
    pocketName: pocketInfo.name,
    isRekap: false,
    snapshot: {
      year: snapshot.year,
      month: snapshot.month,
      period_start: snapshot.period_start,
      period_end: snapshot.period_end,
      opening_balance: snapshot.opening_balance,
      total_income: snapshot.total_income,
      total_expense: snapshot.total_expense,
      closing_balance: snapshot.closing_balance,
      transaction_count: snapshot.transaction_count,
      pockets: [
        {
          pocket_name: snapshot.pocket_name,
          opening_balance: snapshot.opening_balance,
          total_income: snapshot.total_income,
          total_expense: snapshot.total_expense,
          total_transfer_in: snapshot.total_transfer_in,
          total_transfer_out: snapshot.total_transfer_out,
          closing_balance: snapshot.closing_balance,
        },
      ],
      total_transfer_in: snapshot.total_transfer_in,
      total_transfer_out: snapshot.total_transfer_out,
    },
    transactions: txRows.map((t) => ({
      id: t.id,
      date: t.transaction_date,
      description: t.description ?? t.category?.name ?? "-",
      pocket: t.pocket?.name ?? pocketInfo.name,
      category: t.category?.name ?? "-",
      type: t.type as "income" | "expense",
      amount: t.amount,
    })),
    transfers: trRowsRaw.map((tr) => ({
      id: tr.id,
      date: tr.transaction_date,
      from: tr.from_pocket?.name ?? "-",
      to: tr.to_pocket?.name ?? "-",
      amount: tr.amount,
      description: tr.description,
    })),
  });

  const monthName = getMonthLabel(month);
  const filename = `RTFinance-Laporan-${type === "kas" ? "Kas" : "BOP"}-${monthName}-${year}.pdf`;
  const totals = {
    income: snapshot.total_income,
    expense: snapshot.total_expense,
    net: snapshot.closing_balance - snapshot.opening_balance,
    count: snapshot.transaction_count,
  };
  const caption = [
    `📄 Laporan ${type === "kas" ? "Kas" : "BOP"}`,
    `${monthName} ${year}`,
    ``,
    `Total Pemasukan: ${formatRupiah(totals.income)}`,
    `Total Pengeluaran: ${formatRupiah(totals.expense)}`,
    `Saldo: ${formatRupiah(snapshot.closing_balance)}`,
    totals.count === 0 ? `Tidak ada transaksi pada periode ini.` : `${totals.count} transaksi`,
  ].join("\n");

  return { buffer, filename, caption, totals };
}

export function buildMonthKeyboard(prefix: string): { inline_keyboard: { text: string; callback_data: string }[][] } {
  // prefix is e.g. "rt:report:kas" or "rt:report:bop", we will append :month
  // callback will be `${prefix}:${month}`
  const rows: { text: string; callback_data: string }[][] = [];
  for (let r = 0; r < 4; r++) {
    const row: { text: string; callback_data: string }[] = [];
    for (let c = 0; c < 3; c++) {
      const month = r * 3 + c + 1;
      const label = MONTH_LABELS[month - 1];
      row.push({ text: label, callback_data: `${prefix}:${month}` });
    }
    rows.push(row);
  }
  return { inline_keyboard: rows };
}

export function buildReportTypeKeyboard(): { inline_keyboard: { text: string; callback_data: string }[][] } {
  return {
    inline_keyboard: [
      [
        { text: "💵 Kas", callback_data: "rt:report:kas" },
        { text: "🏛️ BOP", callback_data: "rt:report:bop" },
      ],
    ],
  };
}
