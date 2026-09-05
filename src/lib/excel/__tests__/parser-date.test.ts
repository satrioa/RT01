import { describe, expect, it } from "vitest";
import { parseExcelDate } from "../parser";

describe("parseExcelDate DD/MM/YYYY", () => {
  it("05/01/2024 = 5 Jan (bukan 1 Mei)", () => {
    expect(parseExcelDate("05/01/2024")).toBe("2024-01-05");
  });
  it("05-09-2026 dan 05.09.2026 = 5 Sep 2026", () => {
    expect(parseExcelDate("05-09-2026")).toBe("2026-09-05");
    expect(parseExcelDate("05.09.2026")).toBe("2026-09-05");
  });
  it("YYYY-MM-DD tetap jalan", () => {
    expect(parseExcelDate("2024-01-05")).toBe("2024-01-05");
  });
  it("DD/MM/YY → 20YY", () => {
    expect(parseExcelDate("05/01/24")).toBe("2024-01-05");
  });
  it("tanggal mustahil ditolak", () => {
    expect(parseExcelDate("30/02/2024")).toBeNull();
    expect(parseExcelDate("05/13/2024")).toBeNull();
    expect(parseExcelDate("32/01/2024")).toBeNull();
  });
  it("29/02/2024 kabisat OK, 29/02/2023 ditolak", () => {
    expect(parseExcelDate("29/02/2024")).toBe("2024-02-29");
    expect(parseExcelDate("29/02/2023")).toBeNull();
  });
  it("Date object tidak geser (WIB)", () => {
    expect(parseExcelDate(new Date(2024, 0, 5, 0, 0, 0))).toBe("2024-01-05");
  });
  it("nama bulan Indonesia: '9 Agustus-2026' = 9 Agu 2026", () => {
    expect(parseExcelDate("9 Agustus-2026")).toBe("2026-08-09");
    expect(parseExcelDate("9 Agustus 2026")).toBe("2026-08-09");
    expect(parseExcelDate("9-Agustus-2026")).toBe("2026-08-09");
    expect(parseExcelDate("9 Agu 2026")).toBe("2026-08-09");
    expect(parseExcelDate("9 AGS 2026")).toBe("2026-08-09");
    expect(parseExcelDate("17 Agustus 1945")).toBe("1945-08-17");
    expect(parseExcelDate("29 Februari 2024")).toBe("2024-02-29");
  });
  it("nama bulan tak dikenal / tanggal mustahil → null", () => {
    expect(parseExcelDate("9 Foo-2026")).toBeNull();
    expect(parseExcelDate("30 Februari 2024")).toBeNull();
  });
  it("kosong → null", () => {
    expect(parseExcelDate("")).toBeNull();
    expect(parseExcelDate(null)).toBeNull();
    expect(parseExcelDate(undefined)).toBeNull();
  });
});
