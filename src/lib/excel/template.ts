import * as XLSX from "xlsx";

export function buildImportTemplate(): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Template — kolom Tanggal dipaksa TEXT agar Excel TIDAK PERNAH
  // auto-konversi ketikan menjadi serial date mengikuti locale (mis. Excel
  // US membaca "12/2/2026" sebagai 2 Des, padahal maksudnya 12 Feb).
  // Parser aplikasi membaca teks DD/MM/YYYY secara eksplisit (Indonesia).
  const headers = ["Tanggal", "Keterangan", "Pemasukan", "Pengeluaran", "Kantong", "Kategori"];
  const examples: (string | number)[][] = [
    ["05/01/2024", "Iuran warga Januari", 500000, "", "Kas", "Iuran Warga"],
    ["06/01/2024", "Beli konsumsi kerja bakti", "", 75000, "Kas", "Konsumsi"],
    ["07/01/2024", "Retribusi sampah", 100000, "", "Kas", "Retribusi"],
    ["08/01/2024", "Sumbangan warga", 200000, "", "Sosial", "Sumbangan"],
    ["10/01/2024", "Bayar kebersihan", "", 300000, "Kas", "Kebersihan"],
    ["12/02/2026", "Contoh: 12 Februari 2026 (bukan 2 Des)", 100000, "", "Kas", "Lain-lain"],
  ];

  const wsData = [headers, ...examples];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Format TEXT untuk seluruh kolom Tanggal (header + contoh + 5000 baris kosong)
  // agar ketikan pengguna tetap teks DD/MM/YYYY apa pun locale Excel-nya
  const lastRow = Math.max(examples.length + 1, 5000);
  for (let r = 2; r <= lastRow; r++) {
    const addr = `A${r}`;
    const cell = ws[addr] as XLSX.CellObject | undefined;
    if (cell) {
      cell.t = "s";
      cell.z = "@";
    } else {
      ws[addr] = { t: "s", v: "", z: "@" } as unknown as XLSX.CellObject;
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
    ["- Tanggal: format DD/MM/YYYY (contoh: 05/01/2024 = 5 Januari 2024, 12/02/2026 = 12 Februari 2026)."],
    ["- PENTING: kolom Tanggal di template dikunci sebagai TEKS agar Excel tidak mengubah sendiri (mis. Excel US membaca 12/2/2026 sebagai 2 Des). Ketik persis DD/MM/YYYY, jangan ubah format kolom."],
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
  // cellStyles:true agar format sel (z:'@' TEXT kolom Tanggal, bold header) ikut tertulis
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx", cellStyles: true }) as Buffer);
}
