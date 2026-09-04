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
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
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

export function parseExcelDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number") {
    // Excel serial date
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    const d = new Date(parsed.y, parsed.m - 1, parsed.d);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return null;
    // Try common Indonesian formats: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
    // Normalize
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      // Avoid mis-parse of DD/MM/YYYY as MM/DD — try manual
      const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (m) {
        const day = Number(m[1]);
        const month = Number(m[2]);
        const year = Number(m[3]);
        const manual = new Date(year, month - 1, day);
        if (!isNaN(manual.getTime())) return manual.toISOString().slice(0, 10);
      }
      return d.toISOString().slice(0, 10);
    }
    // Try DD/MM/YYYY manual only
    const dm = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dm) {
      const day = Number(dm[1]);
      const month = Number(dm[2]);
      const year = Number(dm[3]);
      const dd = new Date(year, month - 1, day);
      if (!isNaN(dd.getTime())) return dd.toISOString().slice(0, 10);
    }
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
