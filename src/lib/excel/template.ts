import * as XLSX from "xlsx";

export function buildImportTemplate(): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Template — tanggal sebagai Date asli + format sel DD/MM/YYYY
  // agar Excel (locale Indonesia) selalu menampilkan & menyimpan tanggal benar
  const headers = ["Tanggal", "Keterangan", "Pemasukan", "Pengeluaran", "Kantong", "Kategori"];
  const d = (y: number, m: number, day: number) => new Date(y, m - 1, day, 12, 0, 0);
  const examples: (string | number | Date)[][] = [
    [d(2024, 1, 5), "Iuran warga Januari", 500000, "", "Kas", "Iuran Warga"],
    [d(2024, 1, 6), "Beli konsumsi kerja bakti", "", 75000, "Kas", "Konsumsi"],
    [d(2024, 1, 7), "Retribusi sampah", 100000, "", "Kas", "Retribusi"],
    [d(2024, 1, 8), "Sumbangan warga", 200000, "", "Sosial", "Sumbangan"],
    [d(2024, 1, 10), "Bayar kebersihan", "", 300000, "Kas", "Kebersihan"],
  ];

  const wsData = [headers, ...examples];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Paksa format tampilan kolom Tanggal ke DD/MM/YYYY (baris contoh 2-6)
  for (let r = 2; r <= examples.length + 1; r++) {
    const addr = `A${r}`;
    const cell = ws[addr] as XLSX.CellObject | undefined;
    if (cell) {
      cell.z = "DD/MM/YYYY";
      if (cell.t !== "d") cell.t = "d";
    }
  }

  // Column widths
  ws["!cols"] = [{ wch: 12 }, { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 16 }];

  // Header style: bold (if supported)
  const headerStyle = { font: { bold: true }, fill: { fgColor: { rgb: "FFF3F4F6" } } };
  ["A1", "B1", "C1", "D1", "E1", "F1"].forEach((cell) => {
    if (ws[cell]) (ws[cell] as unknown as { s: unknown }).s = headerStyle;
  });

  // Data validation and format: set number format for amount columns
  XLSX.utils.book_append_sheet(wb, ws, "Transaksi");

  // Sheet 2: Petunjuk
  const instructionData = [
    ["Petunjuk Import Excel RT Finance"],
    [""],
    ["Kolom wajib:"],
    ["- Tanggal: format DD/MM/YYYY (contoh: 05/01/2024 = 5 Januari 2024). Kolom Tanggal di template sudah diformat DD/MM/YYYY — cukup ketik seperti contoh."],
    ["- Tanggal tidak valid (mis. bulan 13, 30 Februari) akan ditolak saat validasi, bukan ditebak."],
    ["- Keterangan: deskripsi transaksi, tidak boleh kosong"],
    ["- Pemasukan ATAU Pengeluaran: isi salah satu, nominal >0, contoh: 75000 atau 500000"],
    ["- Kantong: harus sesuai nama kantong di aplikasi (Kas, BOP, Sosial, Kegiatan) atau mapping manual"],
    ["- Kategori: harus sesuai kategori di aplikasi (Iuran Warga, Konsumsi, dll) atau mapping manual"],
    [""],
    ["Aturan:"],
    ["- Isi Pemasukan untuk pemasukan, Pengeluaran untuk pengeluaran — jangan isi keduanya"],
    ["- Jika ada kolom Amount tunggal, map ke Pemasukan/Pengeluaran sesuai tipe"],
    ["- Jika kantong kosong, akan pakai Kantong default yang dipilih saat import"],
    ["- Kategori kosong: transaksi tetap diimport tanpa kategori (warning, bukan error)"],
    ["- Kategori tidak dikenal: akan error — map manual di langkah Map Kategori"],
    ["- Duplikat (Tanggal+Nominal+Tipe+Kantong+Keterangan sama) akan dilewati"],
    [""],
    ["Kantong contoh: Kas, BOP, Sosial, Kegiatan"],
    ["Kategori Pemasukan: Iuran Warga, Sumbangan, Retribusi, Lain-lain"],
    ["Kategori Pengeluaran: Konsumsi, Kegiatan, Kebersihan, Keamanan, Administrasi, Sosial, Sarana & Prasarana, Lain-lain"],
    [""],
    ["Workflow: Upload Excel → Pilih Sheet → Preview → Map Kolom → Map Kantong/Kategori → Validasi → Import"],
    ["Semua transaksi masuk ke ledger yang sama — tidak buat tabel per bulan."],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(instructionData);
  ws2["!cols"] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(wb, ws2, "Petunjuk");

  return wb;
}

export function templateToBuffer(wb: XLSX.WorkBook): Buffer {
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer);
}
