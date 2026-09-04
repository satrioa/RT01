"use server";

import { parseSmartInput, type SmartParseResult } from "./parser";

export async function parseSmartInputAction(input: string): Promise<SmartParseResult> {
  // Input length guard already in parser, but double-check
  const trimmed = input.trim();
  if (!trimmed) return { type: "error", error: "Input kosong." };
  return parseSmartInput(trimmed);
}
