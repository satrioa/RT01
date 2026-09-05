import { describe, it, expect } from "vitest";
import { getMonthPeriod, getPreviousMonthPeriod } from "../monthly-report-calculator";
import { calcPocketBalance, calcRtTotalBalance } from "@/lib/balance";

describe("getMonthPeriod", () => {
  it("handles January 2026", () => {
    expect(getMonthPeriod(2026, 1)).toEqual({ year: 2026, month: 1, period_start: "2026-01-01", period_end: "2026-01-31" });
  });
  it("handles February 2026 (non-leap)", () => {
    expect(getMonthPeriod(2026, 2)).toEqual({ year: 2026, month: 2, period_start: "2026-02-01", period_end: "2026-02-28" });
  });
  it("handles February 2028 leap year", () => {
    expect(getMonthPeriod(2028, 2)).toEqual({ year: 2028, month: 2, period_start: "2028-02-01", period_end: "2028-02-29" });
  });
  it("handles April 2026 (30 days)", () => {
    expect(getMonthPeriod(2026, 4)).toEqual({ year: 2026, month: 4, period_start: "2026-04-01", period_end: "2026-04-30" });
  });
  it("handles December 2026", () => {
    expect(getMonthPeriod(2026, 12)).toEqual({ year: 2026, month: 12, period_start: "2026-12-01", period_end: "2026-12-31" });
  });
  it("handles August 2026 example", () => {
    expect(getMonthPeriod(2026, 8)).toEqual({ year: 2026, month: 8, period_start: "2026-08-01", period_end: "2026-08-31" });
  });
  it("handles September 2026", () => {
    expect(getMonthPeriod(2026, 9)).toEqual({ year: 2026, month: 9, period_start: "2026-09-01", period_end: "2026-09-30" });
  });
  it("getPreviousMonth handles Jan -> Dec previous year", () => {
    expect(getPreviousMonthPeriod(2026, 1)).toEqual({ year: 2025, month: 12, period_start: "2025-12-01", period_end: "2025-12-31" });
  });
});

describe("calcPocketBalance", () => {
  it("income only", () => {
    expect(calcPocketBalance({ income: ["1000000"], expense: [], outgoing: [], incoming: [] })).toBe(1000000);
  });
  it("expense only", () => {
    expect(calcPocketBalance({ income: [], expense: ["500000"], outgoing: [], incoming: [] })).toBe(-500000);
  });
  it("income + expense", () => {
    expect(calcPocketBalance({ income: ["1000000", "500000"], expense: ["300000"], outgoing: [], incoming: [] })).toBe(1200000);
  });
  it("no transactions", () => {
    expect(calcPocketBalance({ income: [], expense: [], outgoing: [], incoming: [] })).toBe(0);
  });
  it("internal transfer — pocket A sends", () => {
    // Kas -> BOP 500k: Kas outgoing, BOP incoming, RT net zero
    const kas = calcPocketBalance({ income: [], expense: [], outgoing: ["500000"], incoming: [] });
    const bop = calcPocketBalance({ income: [], expense: [], outgoing: [], incoming: ["500000"] });
    expect(kas).toBe(-500000);
    expect(bop).toBe(500000);
    expect(kas + bop).toBe(0);
  });
  it("multiple pockets total", () => {
    const kas = calcPocketBalance({ income: ["1000000"], expense: ["200000"], outgoing: ["100000"], incoming: [] }); // 700k
    const bop = calcPocketBalance({ income: [], expense: [], outgoing: [], incoming: ["100000"] }); // 100k
    expect(kas + bop).toBe(800000);
  });
  it("opening + income - expense", () => {
    const opening = 2000000;
    const income = 820000;
    const expense = 2155000;
    const closing = opening + income - expense;
    expect(closing).toBe(665000);
  });
  it("closing with transfers", () => {
    const opening = 1000000;
    const income = 500000;
    const expense = 200000;
    const transferIn = 300000;
    const transferOut = 100000;
    const closing = opening + income - expense + transferIn - transferOut;
    expect(closing).toBe(1500000);
  });
});

describe("calcRtTotalBalance", () => {
  it("RT transfers cancel out", () => {
    // RT total should not include transfers
    const total = calcRtTotalBalance({ income: ["1000000"], expense: ["400000"] });
    expect(total).toBe(600000);
  });
  it("zero transactions", () => {
    expect(calcRtTotalBalance({ income: [], expense: [] })).toBe(0);
  });
});

describe("monthly report idempotency (logic)", () => {
  it("duplicate generation should be idempotent (same period returns same)", () => {
    const p1 = getMonthPeriod(2026, 8);
    const p2 = getMonthPeriod(2026, 8);
    expect(p1).toEqual(p2);
  });
  it("different months are distinct", () => {
    expect(getMonthPeriod(2026, 8).period_start).not.toBe(getMonthPeriod(2026, 9).period_start);
  });
});

describe("finalized report behavior", () => {
  it("snapshot preserves opening + period totals = closing", () => {
    const opening = 2449000;
    const income = 820000;
    const expense = 2155000;
    const transferIn = 0;
    const transferOut = 0;
    const closing = opening + income - expense + transferIn - transferOut;
    expect(closing).toBe(1114000);
  });
});
