import * as XLSX from "xlsx";

export function buildImportTemplate(): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Template
  const headers = ["Tanggal", "Keterangan", "Pemasukan", "Pengeluaran", "Kantong", "Kategori"];
  const examples = [
    ["2024-01-05", "Iuran warga Januari", 500000, "", "Kas", "Iuran Warga"],
    ["2024-01-06", "Beli konsumsi kerja bakti", "", 75000, "Kas", "Konsumsi"],
    ["2024-01-07", "Retribusi sampah", 100000, "", "Kas", "Retribusi"],
    ["2024-01-08", "Sumbangan warga", 200000, "", "Sosial", "Sumbangan"],
    ["2024-01-10", "Bayar kebersihan", "", 300000, "Kas", "Kebersihan"],
  ];

  const wsData = [headers, ...examples];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

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
    ["- Tanggal: format YYYY-MM-DD atau DD/MM/YYYY (contoh: 2024-01-05 atau 05/01/2024)"],
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
