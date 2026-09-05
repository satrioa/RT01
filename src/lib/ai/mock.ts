import type { AiProvider } from "./provider";
import type { AiContext, AiParsedResult } from "./types";

/**
 * Mock provider for dev/preview when OPENROUTER_API_KEY not set.
 * Uses simple keyword heuristics — never invents, clearly needs_confirmation when ambiguous.
 */
export class MockProvider implements AiProvider {
  name = "mock";

  async parse(userMessage: string, context: AiContext): Promise<AiParsedResult> {
    const raw = userMessage.toLowerCase();
    const pockets = context.pockets;

    // Amount parser: "75 ribu" → 75000, "1 juta" → 1000000, "500rb"→500000
    const amount = parseAmount(raw);
    const hasPindah = /pindah(?:kan)?|transfer/.test(raw);
    const isIncome = /iuran|masuk|sumbang|terima|dapat/.test(raw);

    // Find pockets mentioned
    const mentioned = pockets.filter((p) => raw.includes(p.toLowerCase()));
    // For transfer: try "dari X ke Y"
    if (hasPindah && amount) {
      const fromMatch = raw.match(/dari\s+([a-z0-9]+)/);
      const toMatch = raw.match(/ke\s+([a-z0-9]+)/);
      const from = pockets.find((p) => fromMatch && fromMatch[1].includes(p.toLowerCase())) ?? mentioned[0];
      const to = pockets.find((p) => toMatch && toMatch[1].includes(p.toLowerCase())) ?? mentioned[1];
      if (from && to && from.toLowerCase() !== to.toLowerCase()) {
        return {
          intent: "create_transfer",
          amount,
          from_pocket: from,
          to_pocket: to,
          description: cleanDesc(raw),
          transaction_date: null,
          confidence: 0.85,
        } as unknown as AiParsedResult;
      }
      if (!from || !to) {
        return {
          intent: "needs_confirmation",
          needs_confirmation: true,
          questions: ["Transfer dari kantong mana ke mana?"],
          options: pockets,
          partial: { amount, description: cleanDesc(raw) },
          confidence: 0.5,
        } as unknown as AiParsedResult;
      }
    }

    if (!amount) {
      return {
        intent: "needs_confirmation",
        needs_confirmation: true,
        questions: ["Nominal berapa? Contoh: 75 ribu atau 1 juta"],
        partial: { description: cleanDesc(raw) },
        confidence: 0.4,
      } as unknown as AiParsedResult;
    }

    const pocket = mentioned[0];
    if (!pocket) {
      return {
        intent: "needs_confirmation",
        needs_confirmation: true,
        questions: ["Bayarnya dari kantong mana?"],
        options: pockets,
        partial: {
          type: isIncome ? "income" : "expense",
          amount,
          description: cleanDesc(raw),
        },
        confidence: 0.6,
      } as unknown as AiParsedResult;
    }

    // Try category heuristics — diperluas untuk makanan/minuman/operasional
    const catKeywords: Record<string, { name: string; reason: string }> = {
      konsumsi: { name: "Konsumsi", reason: "makanan" },
      makan: { name: "Konsumsi", reason: "makanan" },
      ayam: { name: "Konsumsi", reason: "makanan" },
      mie: { name: "Konsumsi", reason: "makanan" },
      minum: { name: "Konsumsi", reason: "minuman" },
      air: { name: "Konsumsi", reason: "minuman" },
      mineral: { name: "Konsumsi", reason: "minuman" },
      iuran: { name: "Iuran Warga", reason: "iuran rutin" },
      warga: { name: "Iuran Warga", reason: "iuran rutin" },
      sumbang: { name: "Sumbangan", reason: "sumbangan" },
      kebersihan: { name: "Kebersihan", reason: "kebersihan" },
      keamanan: { name: "Keamanan", reason: "keamanan" },
      kegiatan: { name: "Kegiatan", reason: "kegiatan" },
      bensin: { name: "Operasional", reason: "transport" },
      solar: { name: "Operasional", reason: "transport" },
      transport: { name: "Operasional", reason: "transport" },
      listrik: { name: "Operasional", reason: "tagihan listrik" },
      wifi: { name: "Operasional", reason: "tagihan wifi" },
      atk: { name: "Operasional", reason: "atk" },
      operasional: { name: "Operasional", reason: "operasional" },
      retribusi: { name: "Retribusi", reason: "retribusi" },
      administrasi: { name: "Administrasi", reason: "administrasi" },
      sosial: { name: "Sosial", reason: "sosial" },
      sarana: { name: "Sarana & Prasarana", reason: "sarana" },
    };
    let category: string | null = null;
    let category_reason: string | null = null;
    for (const [kw, info] of Object.entries(catKeywords)) {
      if (raw.includes(kw) && context.categories.some((c) => c.name.toLowerCase() === info.name.toLowerCase())) {
        category = info.name;
        category_reason = info.reason;
        break;
      }
    }
    // fallback: tebak by type jika tidak ketemu keyword
    if (!category) {
      const fallback =
        context.categories.find((c) => c.name.toLowerCase() === "lain-lain") ??
        context.categories.find((c) => c.type === (isIncome ? "income" : "expense")) ??
        context.categories.find((c) => c.type === "both") ??
        context.categories[0];
      if (fallback) {
        category = fallback.name;
        category_reason = "default";
      }
    }

    const type: "income" | "expense" = isIncome ? "income" : "expense";
    const isFallback = category_reason === "default";
    return {
      intent: "create_transaction",
      type,
      amount,
      pocket,
      category,
      category_confidence: category ? (isFallback ? 0.55 : 0.82) : 0.4,
      category_reason: category_reason ?? null,
      description: cleanDesc(raw),
      transaction_date: null,
      confidence: 0.75,
    } as unknown as AiParsedResult;
  }
}

function parseAmount(raw: string): number | null {
  // "75 ribu" / "75rb" / "75.000" / "1 juta" / "1,5 juta" / "500 ribu"
  const ribu = raw.match(/(\d+(?:[.,]\d+)?)\s*(ribu|rb)\b/);
  if (ribu) {
    const n = Number(ribu[1].replace(",", "."));
    if (!Number.isNaN(n)) return Math.round(n * 1000);
  }
  const juta = raw.match(/(\d+(?:[.,]\d+)?)\s*(juta|jt)\b/);
  if (juta) {
    const n = Number(juta[1].replace(",", "."));
    if (!Number.isNaN(n)) return Math.round(n * 1_000_000);
  }
  // "500.000" or "75 000"
  const plain = raw.match(/(\d{1,3}(?:[.\s]\d{3})+|\d+)/);
  if (plain) {
    const n = Number(plain[1].replace(/[.\s]/g, ""));
    if (!Number.isNaN(n) && n > 0 && n < 1_000_000_000_000) return n;
  }
  return null;
}

function cleanDesc(raw: string): string {
  // Remove amount and pocket words for cleaner description
  return raw
    .replace(/\d+(?:[.,]\d+)?\s*(ribu|rb|juta|jt)\b/gi, "")
    .replace(/dari\s+\w+|ke\s+\w+|pindah(?:kan)?|transfer/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80) || raw.slice(0, 80);
}
