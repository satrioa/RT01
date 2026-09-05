import * as XLSX from "xlsx";

export async function generateMonthlyExcel(opts: {
  rtName: string;
  rtNumber: string;
  rwNumber: string;
  pocketName?: string | null;
  isRekap?: boolean;
  snapshot: {
    year: number;
    month: number;
    period_start: string;
    period_end: string;
    opening_balance: number;
    total_income: number;
    total_expense: number;
    closing_balance: number;
    transaction_count: number;
    pockets: { pocket_name: string; opening_balance: number; total_income: number; total_expense: number; total_transfer_in: number; total_transfer_out: number; closing_balance: number; transaction_count: number }[];
  };
  transactions: { id: string; date: string; pocket: string; category: string; description: string; type: "income" | "expense"; amount: string }[];
  transfers: { id: string; date: string; from: string; to: string; amount: string; description: string | null }[];
}): Promise<Buffer> {
  const { rtName, rtNumber, rwNumber, pocketName, isRekap, snapshot, transactions, transfers } = opts;
  const isRekapMode = !!isRekap;
  const monthLabel = new Date(snapshot.year, snapshot.month - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  const wb = XLSX.utils.book_new();

  // Sheet 1: Laporan (visual) — header per-kantong vs rekap
  const laporanData: (string | number)[][] = [];
  const title = pocketName ? `LAPORAN KEUANGAN ${pocketName.toUpperCase()} — ${rtName.toUpperCase()}` : `LAPORAN KEUANGAN ${rtName.toUpperCase()} — REKAP`;
  laporanData.push([title]);
  laporanData.push([`RT ${rtNumber} / RW ${rwNumber}${pocketName ? ` • Kantong: ${pocketName}` : " • Semua Kantong"}`]);
  laporanData.push([`Periode: ${snapshot.period_start} – ${snapshot.period_end} (${monthLabel})`]);
  laporanData.push([]);
  laporanData.push(["Saldo Awal", snapshot.opening_balance]);
  laporanData.push([]);
  if (isRekapMode) {
    laporanData.push(["#", "Tanggal", "Kantong", "Uraian", "Pemasukan (Rp)", "Pengeluaran (Rp)", "Saldo (Rp)"]);
  } else {
    laporanData.push(["#", "Tanggal", "Uraian", "Kategori", "Pemasukan (Rp)", "Pengeluaran (Rp)", "Saldo (Rp)"]);
  }
  let running = snapshot.opening_balance;
  transactions
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((t, idx) => {
      const amt = Number(t.amount);
      if (t.type === "income") running += amt;
      else running -= amt;
      if (isRekapMode) {
        laporanData.push([idx + 1, t.date, t.pocket, t.description, t.type === "income" ? amt : "", t.type === "expense" ? amt : "", running]);
      } else {
        laporanData.push([idx + 1, t.date, t.description, t.category, t.type === "income" ? amt : "", t.type === "expense" ? amt : "", running]);
      }
    });
  if (transactions.length === 0) {
    if (isRekapMode) laporanData.push(["-", "-", "-", "Tidak ada transaksi", "", "", running]);
    else laporanData.push(["-", "-", "Tidak ada transaksi", "-", "", "", running]);
  }
  laporanData.push([]);
  laporanData.push(["Total Pemasukan", snapshot.total_income]);
  laporanData.push(["Total Pengeluaran", snapshot.total_expense]);
  laporanData.push(["Surplus / Defisit", snapshot.total_income - snapshot.total_expense]);
  laporanData.push(["Saldo Akhir", snapshot.closing_balance]);
  laporanData.push([]);
  laporanData.push(["Mengetahui,", "", "Dilaporkan Oleh,"]);
  laporanData.push([`KETUA ${rtName.toUpperCase()}`, "", `BENDAHARA ${rtName.toUpperCase()}`]);
  laporanData.push([]);
  laporanData.push(["(tanda tangan & cap)", "", "(tanda tangan)"]);

  const wsLaporan = XLSX.utils.aoa_to_sheet(laporanData);
  wsLaporan["!cols"] = isRekapMode
    ? [{ wch: 6 }, { wch: 12 }, { wch: 14 }, { wch: 30 }, { wch: 16 }, { wch: 16 }, { wch: 16 }]
    : [{ wch: 6 }, { wch: 12 }, { wch: 30 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
  // Currency format — last 3 columns are currency
  const range = XLSX.utils.decode_range(wsLaporan["!ref"] ?? "A1");
  const currencyCols = isRekapMode ? [4, 5, 6] : [4, 5, 6];
  for (let R = 7; R <= range.e.r; R++) {
    for (const C of currencyCols) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = wsLaporan[addr] as XLSX.CellObject | undefined;
      if (cell && typeof cell.v === "number") {
        cell.z = '#,#0';
        cell.t = "n";
      }
    }
  }
  // Summary currency
  for (let R = laporanData.length - 13; R < laporanData.length; R++) {
    const addr = XLSX.utils.encode_cell({ r: R, c: 1 });
    const cell = wsLaporan[addr] as XLSX.CellObject | undefined;
    if (cell && typeof cell.v === "number") {
      cell.z = '#,#0';
      cell.t = "n";
    }
  }
  wsLaporan["!freeze"] = { xSplit: 0, ySplit: 7, topLeftCell: "A8" } as unknown as string;
  wsLaporan["!printSetup"] = { paperSize: 9, orientation: "portrait", fitToPage: true } as unknown as Record<string, unknown>;
  XLSX.utils.book_append_sheet(wb, wsLaporan, "Laporan");

  // Sheet 2: Transaksi
  const txHeader = ["ID", "Tanggal", "Kantong", "Kategori", "Uraian", "Tipe", "Nominal", "Sumber"];
  const txRows = transactions.map((t) => [t.id, t.date, t.pocket, t.category, t.description, t.type, Number(t.amount), "web"]);
  const wsTx = XLSX.utils.aoa_to_sheet([txHeader, ...txRows]);
  wsTx["!cols"] = [{ wch: 38 }, { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 30 }, { wch: 10 }, { wch: 16 }, { wch: 10 }];
  // Format nominal column G (index 6)
  for (let R = 1; R <= txRows.length; R++) {
    const addr = XLSX.utils.encode_cell({ r: R, c: 6 });
    const cell = wsTx[addr] as XLSX.CellObject | undefined;
    if (cell) {
      cell.z = '#,#0';
      cell.t = "n";
    }
  }
  wsTx["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2" } as unknown as string;
  (wsTx as unknown as Record<string, unknown>)["!autofilter"] = { ref: `A1:H${txRows.length + 1}` };
  XLSX.utils.book_append_sheet(wb, wsTx, "Transaksi");

  // Sheet 3: Ringkasan per kantong
  const ringHeader = ["Kantong", "Saldo Awal", "Pemasukan", "Pengeluaran", "Transfer Masuk", "Transfer Keluar", "Saldo Akhir", "Trx Count"];
  const ringRows = snapshot.pockets.map((p) => [
    p.pocket_name,
    p.opening_balance,
    p.total_income,
    p.total_expense,
    p.total_transfer_in,
    p.total_transfer_out,
    p.closing_balance,
    p.transaction_count,
  ]);
  // Add total row
  ringRows.push([
    "TOTAL RT",
    snapshot.opening_balance,
    snapshot.total_income,
    snapshot.total_expense,
    snapshot.pockets.reduce((s, p) => s + p.total_transfer_in, 0),
    snapshot.pockets.reduce((s, p) => s + p.total_transfer_out, 0),
    snapshot.closing_balance,
    snapshot.transaction_count,
  ]);
  const wsRing = XLSX.utils.aoa_to_sheet([ringHeader, ...ringRows]);
  wsRing["!cols"] = [{ wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 10 }];
  for (let R = 1; R <= ringRows.length; R++) {
    for (let C = 1; C <= 6; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = wsRing[addr] as XLSX.CellObject | undefined;
      if (cell && typeof cell.v === "number") {
        cell.z = '#,#0';
        cell.t = "n";
      }
    }
  }
  wsRing["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2" } as unknown as string;
  XLSX.utils.book_append_sheet(wb, wsRing, "Ringkasan");

  // Sheet 4: Transfer Internal
  const trHeader = ["From Kantong", "To Kantong", "Tanggal", "Nominal", "Keterangan"];
  const trRows = transfers.map((tr) => [tr.from, tr.to, tr.date, Number(tr.amount), tr.description ?? "-"]);
  const wsTr = XLSX.utils.aoa_to_sheet([trHeader, ...trRows]);
  wsTr["!cols"] = [{ wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 16 }, { wch: 30 }];
  for (let R = 1; R <= trRows.length; R++) {
    const addr = XLSX.utils.encode_cell({ r: R, c: 3 });
    const cell = wsTr[addr] as XLSX.CellObject | undefined;
    if (cell) {
      cell.z = '#,#0';
      cell.t = "n";
    }
  }
  wsTr["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2" } as unknown as string;
  XLSX.utils.book_append_sheet(wb, wsTr, "Transfer Internal");

  const out = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return Buffer.from(out as Buffer);
}
