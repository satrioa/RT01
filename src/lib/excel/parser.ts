import * as XLSX from "xlsx";

export interface WorkbookInfo {
  sheetNames: string[];
}

export interface SheetData {
  sheetName: string;
  headers: string[];
  rows: Record<string, unknown>[];
  rawRows: unknown[][]; // for preview
}

export function parseWorkbook(buffer: ArrayBuffer): { workbook: XLSX.WorkBook; info: WorkbookInfo } {
  // cellNF:true agar format sel (.z) ikut terparse bila dibutuhkan
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true, cellNF: true });
  return {
    workbook,
    info: { sheetNames: workbook.SheetNames },
  };
}

export function extractSheet(workbook: XLSX.WorkBook, sheetName: string, headerRowIndex = 0): SheetData {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`Sheet "${sheetName}" not found`);

  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
  }) as unknown as unknown[][];

  if (json.length === 0) {
    return { sheetName, headers: [], rows: [], rawRows: [] };
  }

  // Headers from headerRowIndex
  const headers: string[] = (json[headerRowIndex] as unknown[]).map((h, i) => {
    const s = String(h ?? "").trim();
    return s || `Column ${i + 1}`;
  });

  const rawRows = json.slice(headerRowIndex + 1) as unknown[][];

  const rows: Record<string, unknown>[] = rawRows.map((row) => {
    const obj: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] ?? "";
    });
    return obj;
  });

  return { sheetName, headers, rows, rawRows };
}

function toLocalISODate(d: Date): string | null {
  // Local getters (bukan toISOString/UTC) agar tanggal WIB tidak mundur 1 hari
  if (isNaN(d.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const INDONESIAN_MONTHS: Record<string, number> = {
  januari: 1, februari: 2, maret: 3, april: 4, mei: 5, juni: 6,
  juli: 7, agustus: 8, september: 9, oktober: 10, november: 11, desember: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, agu: 8, ags: 8,
  sep: 9, sept: 9, okt: 10, nov: 11, des: 12,
  january: 1, february: 2, march: 3, may: 5, june: 6, july: 7,
  august: 8, october: 10, december: 12,
};

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  const dim = new Date(year, month, 0).getDate(); // hari terakhir bulan (kabisat-aware)
  if (day < 1 || day > dim) return false;
  return true;
}

export function parseExcelDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) {
    return toLocalISODate(value);
  }
  if (typeof value === "number") {
    // Excel serial date
    if (!isFinite(value)) return null;
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    if (!isValidCalendarDate(parsed.y, parsed.m, parsed.d)) return null;
    return toLocalISODate(new Date(parsed.y, parsed.m - 1, parsed.d));
  }
  if (typeof value === "string") {
    const s = value.trim().replace(/\s+/g, " ");
    if (!s) return null;

    // 1) YYYY-MM-DD (strict, ISO)
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) {
      const year = Number(m[1]);
      const month = Number(m[2]);
      const day = Number(m[3]);
      if (!isValidCalendarDate(year, month, day)) return null;
      return toLocalISODate(new Date(year, month - 1, day));
    }

    // 2) DD/MM/YYYY — juga DD-MM-YYYY & DD.MM.YYYY (format template Indonesia).
    //    WAJIB didahulukan sebelum new Date() karena "05/01/2024" akan
    //    disalahartikan sebagai MM/DD/YYYY (1 Mei, bukan 5 Jan).
    m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
    if (m) {
      const day = Number(m[1]);
      const month = Number(m[2]);
      const year = Number(m[3]);
      if (!isValidCalendarDate(year, month, day)) return null;
      return toLocalISODate(new Date(year, month - 1, day));
    }

    // 3) DD/MM/YY → 20YY
    m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2})$/);
    if (m) {
      const day = Number(m[1]);
      const month = Number(m[2]);
      const year = 2000 + Number(m[3]);
      if (!isValidCalendarDate(year, month, day)) return null;
      return toLocalISODate(new Date(year, month - 1, day));
    }

    // 4) Nama bulan Indonesia/Inggris: "9 Agustus 2026", "9 Agustus-2026",
    //    "9-Agustus-2026", "9 Agu 2026", "17 Agustus 1945".
    m = s.match(/^(\d{1,2})\s*[-/.\s]\s*([A-Za-z]+)\s*[-/.\s]\s*(\d{2,4})$/);
    if (m) {
      const day = Number(m[1]);
      const month = INDONESIAN_MONTHS[m[2].toLowerCase()];
      let year = Number(m[3]);
      if (m[3].length === 2) year += 2000;
      if (month === undefined) return null;
      if (!isValidCalendarDate(year, month, day)) return null;
      return toLocalISODate(new Date(year, month - 1, day));
    }

    // 5) Fallback: format teks lain. Sengaja terakhir agar pola di atas
    //    tidak pernah lewat sini.
    const d = new Date(s);
    if (!isNaN(d.getTime())) return toLocalISODate(d);
  }
  return null;
}

export function parseExcelAmount(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    if (!isFinite(value)) return null;
    return value;
  }
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return null;
    // Remove Rp, dots, commas, spaces — Indonesian: 1.500.000 or 1,500,000 or 75000
    // Keep digits and comma/dot for decimal, but RT amounts are integers
    const cleaned = s.replace(/[Rp\s]/gi, "").replace(/\./g, "").replace(/,/g, ".");
    const n = Number(cleaned);
    if (Number.isNaN(n) || !isFinite(n)) return null;
    // Also handle "75 ribu" -> 75000, "1 juta" -> 1000000
    if (/ribu|rb/i.test(s)) {
      const m = s.match(/(\d+(?:[.,]\d+)?)/);
      if (m) {
        const num = Number(m[1].replace(",", "."));
        if (!Number.isNaN(num)) return Math.round(num * 1000);
      }
    }
    if (/juta|jt/i.test(s)) {
      const m = s.match(/(\d+(?:[.,]\d+)?)/);
      if (m) {
        const num = Number(m[1].replace(",", "."));
        if (!Number.isNaN(num)) return Math.round(num * 1_000_000);
      }
    }
    return n;
  }
  return null;
}
