import { describe, expect, it } from "vitest";
import { buildImportTemplate, templateToBuffer } from "../template";
import { extractSheet, parseExcelDate, parseWorkbook } from "../parser";

describe("template tanggal DD/MM/YYYY text", () => {
  it("kolom Tanggal bertipe teks, contoh terparse benar, tanpa phantom rows", () => {
    const wb = buildImportTemplate();
    const buf = templateToBuffer(wb);
    console.log("template bytes:", buf.length);
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
    const { workbook } = parseWorkbook(ab);
    const sheet = workbook.Sheets["Transaksi"];
    expect(sheet["A2"].t).toBe("s");
    expect(sheet["A2"].z).toBe("@");
    const data = extractSheet(workbook, "Transaksi");
    expect(data.rows.length).toBe(6);
    expect(parseExcelDate(data.rows[0]["Tanggal"])).toBe("2024-01-05");
    expect(parseExcelDate(data.rows[5]["Tanggal"])).toBe("2026-02-12");
  });
  it("kasus laporan: '12/2/2026' = 12 Feb 2026", () => {
    expect(parseExcelDate("12/2/2026")).toBe("2026-02-12");
  });
});
