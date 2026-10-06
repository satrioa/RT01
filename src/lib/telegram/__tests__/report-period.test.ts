import { describe, expect, it } from "vitest";
import { parsePeriodInput } from "../report";

describe("parsePeriodInput", () => {
  it("rentang DD/MM/YYYY - DD/MM/YYYY", () => {
    expect(parsePeriodInput("05/03/2026 - 20/03/2026")).toEqual({ start: "2026-03-05", end: "2026-03-20" });
  });
  it("rentang ISO dengan s/d", () => {
    expect(parsePeriodInput("2026-03-01 s/d 2026-03-31")).toEqual({ start: "2026-03-01", end: "2026-03-31" });
  });
  it("satu tanggal = periode satu hari", () => {
    expect(parsePeriodInput("05/03/2026")).toEqual({ start: "2026-03-05", end: "2026-03-05" });
  });
  it("tanggal mustahil ditolak", () => {
    expect(parsePeriodInput("31/02/2026")).toBeNull();
  });
  it("start > end ditolak", () => {
    expect(parsePeriodInput("20/03/2026 - 05/03/2026")).toBeNull();
  });
  it("teks tanpa tanggal ditolak", () => {
    expect(parsePeriodInput("hello")).toBeNull();
    expect(parsePeriodInput("")).toBeNull();
  });
  it("tiga token ditolak", () => {
    expect(parsePeriodInput("01/01/2026 - 02/01/2026 - 03/01/2026")).toBeNull();
  });
});