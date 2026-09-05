import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { id } from "date-fns/locale/id";

function formatRupiah(n: number | string): string {
  const v = typeof n === "string" ? Number(n) : n;
  if (!Number.isFinite(v)) return "Rp0";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);
}

function formatDateLong(d: string): string {
  try {
    return format(new Date(d), "d MMMM yyyy", { locale: id });
  } catch {
    return d;
  }
}

export interface PdfTx {
  id: string;
  date: string;
  description: string;
  pocket: string;
  category: string;
  type: "income" | "expense";
  amount: string;
}

export interface PdfTransfer {
  id: string;
  date: string;
  from: string;
  to: string;
  amount: string;
  description: string | null;
}

export async function generateMonthlyPdf(opts: {
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
    total_transfer_in: number;
    total_transfer_out: number;
    closing_balance: number;
    transaction_count: number;
    pockets: { pocket_name: string; opening_balance: number; total_income: number; total_expense: number; total_transfer_in: number; total_transfer_out: number; closing_balance: number }[];
  };
  transactions: PdfTx[];
  transfers: PdfTransfer[];
}): Promise<Buffer> {
  const { rtName, rtNumber, rwNumber, pocketName, isRekap, snapshot, transactions, transfers } = opts;
  const monthLabel = format(new Date(snapshot.year, snapshot.month - 1, 1), "MMMM yyyy", { locale: id });
  const periodLabel = `${formatDateLong(snapshot.period_start)} – ${formatDateLong(snapshot.period_end)}`;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let cursorY = 14;

  // Header — per-kantong vs rekap
  const headerTitle = pocketName ? `LAPORAN KEUANGAN ${pocketName.toUpperCase()} — ${rtName.toUpperCase()}` : `LAPORAN KEUANGAN ${rtName.toUpperCase()} — REKAP`;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(pocketName ? 11 : 13);
  doc.text(headerTitle, pageWidth / 2, cursorY, { align: "center" });
  cursorY += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`RT ${rtNumber} / RW ${rwNumber}${pocketName ? ` • Kantong: ${pocketName}` : " • Semua Kantong"}`, pageWidth / 2, cursorY, { align: "center" });
  cursorY += 5;
  doc.setFontSize(9);
  doc.text(`Periode: ${periodLabel}`, pageWidth / 2, cursorY, { align: "center" });
  cursorY += 4;
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 6;

  // Saldo Awal
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Saldo Awal ${monthLabel}`, margin, cursorY);
  doc.text(formatRupiah(snapshot.opening_balance), pageWidth - margin, cursorY, { align: "right" });
  cursorY += 8;

  // Build table rows with running saldo — columns depend on isRekap
  let running = snapshot.opening_balance;
  const body: (string | number)[][] = [];
  const isRekapMode = !!isRekap;
  // sort transactions by date asc already
  transactions.forEach((t, idx) => {
    const amt = Number(t.amount);
    if (t.type === "income") running += amt;
    else running -= amt;
    if (isRekapMode) {
      // Rekap: Kantong column wajib
      body.push([
        String(idx + 1),
        formatDateLong(t.date),
        t.pocket,
        t.description,
        t.type === "income" ? formatRupiah(amt) : "-",
        t.type === "expense" ? formatRupiah(amt) : "-",
        formatRupiah(running),
      ]);
    } else {
      // Per-kantong: Kategori column (Kantong redundan)
      body.push([
        String(idx + 1),
        formatDateLong(t.date),
        t.description,
        t.category,
        t.type === "income" ? formatRupiah(amt) : "-",
        t.type === "expense" ? formatRupiah(amt) : "-",
        formatRupiah(running),
      ]);
    }
  });

  // If no transactions, add empty row
  if (body.length === 0) {
    if (isRekapMode) body.push(["-", "-", "-", "Tidak ada transaksi", "-", "-", formatRupiah(running)]);
    else body.push(["-", "-", "Tidak ada transaksi", "-", "-", "-", formatRupiah(running)]);
  }

  const headRekap = [["#", "Tanggal", "Kantong", "Uraian", "Pemasukan (Rp)", "Pengeluaran (Rp)", "Saldo (Rp)"]];
  const headPocket = [["#", "Tanggal", "Uraian", "Kategori", "Pemasukan (Rp)", "Pengeluaran (Rp)", "Saldo (Rp)"]];
  autoTable(doc, {
    startY: cursorY,
    head: isRekapMode ? headRekap : headPocket,
    body,
    theme: "grid",
    styles: { fontSize: 6, cellPadding: 1.5, lineColor: [200, 200, 200], textColor: [30, 30, 30] },
    headStyles: { fillColor: [17, 24, 39], textColor: 255, fontStyle: "bold", halign: "center" },
    columnStyles: isRekapMode
      ? {
          0: { halign: "center", cellWidth: 7 },
          1: { cellWidth: 20 },
          2: { cellWidth: 18 },
          3: { cellWidth: 52 },
          4: { halign: "right", cellWidth: 26 },
          5: { halign: "right", cellWidth: 26 },
          6: { halign: "right", cellWidth: 26 },
        }
      : {
          0: { halign: "center", cellWidth: 7 },
          1: { cellWidth: 20 },
          2: { cellWidth: 52 },
          3: { cellWidth: 18 },
          4: { halign: "right", cellWidth: 26 },
          5: { halign: "right", cellWidth: 26 },
          6: { halign: "right", cellWidth: 26 },
        },
    margin: { left: margin, right: margin },
    didDrawPage: (data: { pageNumber: number }) => {
      const pageNum = doc.getNumberOfPages();
      doc.setFontSize(7);
      doc.setTextColor(100);
      const label = pocketName ? `${pocketName} — ${monthLabel}` : `Rekap — ${monthLabel}`;
      doc.text(`Laporan Keuangan ${rtName} — ${label} — Halaman ${data.pageNumber} dari ${pageNum}`, pageWidth / 2, pageHeight - 6, { align: "center" });
    },
  });

  // After table, summary
  let afterTableY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  // Check if need new page for summary + signatures (keep together)
  if (afterTableY > pageHeight - 50) {
    doc.addPage();
    afterTableY = margin;
  }

  // Summary box
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Ringkasan", margin, afterTableY);
  afterTableY += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const sumLines: [string, string][] = [
    ["Total Pemasukan", formatRupiah(snapshot.total_income)],
    ["Total Pengeluaran", formatRupiah(snapshot.total_expense)],
    ["Surplus / Defisit", formatRupiah(snapshot.total_income - snapshot.total_expense)],
    ["Saldo Akhir", formatRupiah(snapshot.closing_balance)],
  ];
  // draw summary table
  autoTable(doc, {
    startY: afterTableY,
    body: sumLines.map(([k, v]) => [k, v]),
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 50 }, 1: { halign: "right" } },
    margin: { left: margin, right: pageWidth / 2 },
  });
  afterTableY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;

  // Pocket summaries — only for rekap (multiple pockets)
  if (isRekap && snapshot.pockets.length > 1) {
    if (afterTableY > pageHeight - 40) {
      doc.addPage();
      afterTableY = margin;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Ringkasan Kantong", margin, afterTableY);
    afterTableY += 4;
    const pocketBody = snapshot.pockets.map((p) => [p.pocket_name, formatRupiah(p.closing_balance)]);
    autoTable(doc, {
      startY: afterTableY,
      head: [["Kantong", "Saldo Akhir"]],
      body: pocketBody,
      theme: "grid",
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [240, 240, 240], textColor: 30 },
      columnStyles: { 1: { halign: "right" } },
      margin: { left: margin, right: pageWidth / 2 },
    });
    afterTableY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
  }

  // Transfer internal if any
  if (transfers.length > 0) {
    if (afterTableY > pageHeight - 30) {
      doc.addPage();
      afterTableY = margin;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Transfer Internal (tidak menambah pemasukan/pengeluaran)", margin, afterTableY);
    afterTableY += 4;
    const trBody = transfers.map((tr, i) => [String(i + 1), formatDateLong(tr.date), `${tr.from} → ${tr.to}`, formatRupiah(Number(tr.amount)), tr.description ?? "-"]);
    autoTable(doc, {
      startY: afterTableY,
      head: [["#", "Tanggal", "Kantong", "Nominal", "Keterangan"]],
      body: trBody,
      theme: "grid",
      styles: { fontSize: 7, cellPadding: 2 },
      columnStyles: { 3: { halign: "right" }, 0: { halign: "center", cellWidth: 8 } },
      margin: { left: margin, right: margin },
    });
    afterTableY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  }

  // Signature area — keep together
  if (afterTableY > pageHeight - 45) {
    doc.addPage();
    afterTableY = margin;
  }
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const sigY = afterTableY + 6;
  const col1X = margin + 10;
  const col2X = pageWidth - margin - 60;
  doc.text("Mengetahui,", col1X, sigY);
  doc.text("Dilaporkan Oleh,", col2X, sigY);
  doc.text(`KETUA ${rtName.toUpperCase()}`, col1X, sigY + 22);
  doc.text(`BENDAHARA ${rtName.toUpperCase()}`, col2X, sigY + 22);
  // lines
  doc.setDrawColor(0);
  doc.line(col1X, sigY + 18, col1X + 45, sigY + 18);
  doc.line(col2X, sigY + 18, col2X + 45, sigY + 18);
  doc.setFontSize(7);
  doc.setTextColor(100);
  doc.text("(tanda tangan & cap)", col1X + 5, sigY + 26);
  doc.text("(tanda tangan)", col2X + 8, sigY + 26);

  const out = doc.output("arraybuffer") as ArrayBuffer;
  return Buffer.from(out);
}
