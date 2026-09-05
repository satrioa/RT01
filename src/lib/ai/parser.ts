import { z } from "zod";

import { createServerClient } from "@/lib/supabase/server";
import { DEV_RT_ID } from "@/lib/env";

import { handleDeterministic } from "./deterministic";
import { GeminiProvider } from "./gemini";
import { MockProvider } from "./mock";

import {
  aiTransactionOutputSchema,
  aiTransferOutputSchema,
  aiNeedsConfirmationSchema,
  type AiParsedResult,
  type AiContext,
} from "./types";
export type SmartParseResult =
  | { type: "deterministic"; answer: string }
  | { type: "transaction"; data: z.infer<typeof aiTransactionOutputSchema> & { pocketId?: string; categoryId?: string | null } }
  | { type: "transfer"; data: z.infer<typeof aiTransferOutputSchema> & { fromPocketId?: string; toPocketId?: string } }
  | { type: "needs_confirmation"; data: z.infer<typeof aiNeedsConfirmationSchema> }
  | { type: "error"; error: string };

async function getContext(): Promise<AiContext> {
  const supabase = createServerClient();
  const rtId = DEV_RT_ID;
  const [pRes, cRes, rRes] = await Promise.all([
    supabase.from("pockets").select("name").eq("rt_id", rtId).eq("is_active", true),
    supabase.from("categories").select("name, type").eq("rt_id", rtId).eq("is_active", true),
    supabase
      .from("transactions")
      .select("description, type, category:categories(name)")
      .eq("rt_id", rtId)
      .not("description", "is", null)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  const pockets = ((pRes.data as { name: string }[] | null) ?? []).map((p) => p.name);
  const categories = ((cRes.data as { name: string; type: "income" | "expense" | "both" }[] | null) ?? []).map((c) => ({
    name: c.name,
    type: c.type as "income" | "expense" | "both",
  }));
  const recentExamples = ((rRes.data as unknown as { description: string | null; type: string; category: { name: string } | null }[] | null) ?? [])
    .filter((r) => r.description && r.category?.name)
    .map((r) => ({
      description: r.description!.slice(0, 40),
      category: r.category!.name,
      type: r.type as "income" | "expense",
    }));
  // fallback to seed names if DB empty
  const finalPockets = pockets.length ? pockets : ["Kas", "BOP", "Sosial", "Kegiatan"];
  const finalCategories = categories.length
    ? categories
    : [
        { name: "Iuran Warga", type: "income" as const },
        { name: "Sumbangan", type: "income" as const },
        { name: "Konsumsi", type: "expense" as const },
        { name: "Kegiatan", type: "expense" as const },
      ];
  return {
    pockets: finalPockets,
    categories: finalCategories,
    currentDate: new Date().toISOString().slice(0, 10),
    recentExamples,
  };
}

function resolvePocketId(name: string, pockets: { id: string; name: string }[]): string | undefined {
  const lower = name.toLowerCase().trim();
  const found = pockets.find((p) => p.name.toLowerCase() === lower);
  return found?.id;
}

function resolveCategoryId(
  name: string | null | undefined,
  categories: { id: string; name: string }[]
): string | null | undefined {
  if (!name) return null;
  const lower = name.toLowerCase().trim();
  const found = categories.find((c) => c.name.toLowerCase() === lower);
  return found ? found.id : null;
}

export async function parseSmartInput(rawInput: string): Promise<SmartParseResult> {
  const input = rawInput.trim();
  if (!input) return { type: "error", error: "Ceritakan transaksinya dulu." };
  if (input.length > 500) return { type: "error", error: "Input terlalu panjang (max 500 karakter)." };

  // Cost optimization: deterministic without AI
  const det = await handleDeterministic(input);
  if (det.handled) {
    return { type: "deterministic", answer: det.answer };
  }

  const ctx = await getContext();

  // Provider/model from DB (per RT) with env fallback
  let providerId: string = "gemini";
  let modelId: string | undefined;
  try {
    const { data: s } = await createServerClient().from("rt_ai_settings").select("provider, model, is_enabled").eq("rt_id", DEV_RT_ID).maybeSingle();
    if (s) {
      const row = s as unknown as { provider: string; model: string; is_enabled: boolean };
      if (row.is_enabled === false) {
        return { type: "error", error: "AI dimatikan di Pengaturan. Aktifkan dulu." };
      }
      providerId = row.provider;
      modelId = row.model;
    } else {
      providerId = process.env.AI_PROVIDER ?? "gemini";
      modelId = process.env.GEMINI_MODEL;
    }
  } catch {
    providerId = process.env.AI_PROVIDER ?? "gemini";
    modelId = process.env.GEMINI_MODEL;
  }
  let provider: import("./provider").AiProvider;

  if (providerId === "mock") {
    provider = new MockProvider();
  } else if (providerId === "gemini" || providerId === "google") {
    const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
    const model = modelId ?? process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
    if (!apiKey) {
      provider = new MockProvider();
    } else {
      provider = new GeminiProvider(apiKey, model);
    }
  } else if (providerId === "openrouter" || providerId === "openai" || providerId === "anthropic") {
    // OpenRouter can proxy openai/anthropic/gemini; use OpenRouterProvider
    const keyMap: Record<string, string | undefined> = {
      openrouter: process.env.OPENROUTER_API_KEY,
      openai: process.env.OPENAI_API_KEY ?? process.env.OPENROUTER_API_KEY,
      anthropic: process.env.ANTHROPIC_API_KEY ?? process.env.OPENROUTER_API_KEY,
    };
    const apiKey = keyMap[providerId] ?? process.env.OPENROUTER_API_KEY;
    const { OpenRouterProvider } = await import("./openrouter");
    const model = modelId ?? process.env.OPENROUTER_MODEL ?? "inclusionai/ling-3.0-flash-fin:free";
    if (!apiKey) {
      provider = new MockProvider();
    } else {
      provider = new OpenRouterProvider(apiKey, model);
    }
  } else {
    return {
      type: "error",
      error: `Provider AI "${providerId}" belum didukung.`,
    };
  }

  let raw: AiParsedResult;
  try {
    raw = await provider.parse(input, ctx);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal parse AI";
    // Fallback to Mock on auth/model/invalid JSON errors — keep app usable
    const isRecoverable =
      msg.includes("401") ||
      msg.includes("404") ||
      msg.toLowerCase().includes("user not found") ||
      msg.toLowerCase().includes("unauthorized") ||
      msg.toLowerCase().includes("is no longer available") ||
      msg.toLowerCase().includes("not_found") ||
      msg.toLowerCase().includes("model") ||
      msg.toLowerCase().includes("invalid json") ||
      msg.toLowerCase().includes("invalid_json") ||
      msg.toLowerCase().includes("returned invalid json");
    if (isRecoverable && providerId !== "mock") {
      try {
        const fallback = new MockProvider();
        raw = await fallback.parse(input, ctx);
        // continue to validation with fallback result — intentionally not returning error
      } catch {
        return { type: "error", error: `${msg} (fallback Mock juga gagal)` };
      }
    } else {
      return { type: "error", error: msg };
    }
  }

  // Validate & enrich — never invent
  if (raw.intent === "needs_confirmation") {
    const parsed = aiNeedsConfirmationSchema.safeParse(raw);
    if (!parsed.success) {
      return { type: "error", error: "AI mengembalikan format needs_confirmation tidak valid." };
    }
    // Ensure options are subset of available pockets if asking for pocket
    const data = parsed.data;
    const q = data.questions.join(" ").toLowerCase();
    const asksPocket = q.includes("kantong");
    if (asksPocket && (!data.options || data.options.length === 0)) {
      data.options = ctx.pockets;
    }
    return { type: "needs_confirmation", data };
  }

  if (raw.intent === "create_transaction") {
    const parsed = aiTransactionOutputSchema.safeParse(raw);
    if (!parsed.success) {
      return { type: "error", error: parsed.error.issues.map((i) => i.message).join("; ") };
    }
    // Pocket must be in available list — otherwise needs_confirmation
    const pocketLower = parsed.data.pocket.toLowerCase();
    const knownPocket = ctx.pockets.some((p) => p.toLowerCase() === pocketLower);
    if (!knownPocket) {
      return {
        type: "needs_confirmation",
        data: {
          intent: "needs_confirmation",
          needs_confirmation: true,
          questions: [`Kantong "${parsed.data.pocket}" tidak ditemukan. Pilih kantong yang tersedia:`],
          options: ctx.pockets,
          partial: { ...parsed.data, raw_input: input },
          confidence: 0.5,
        },
      };
    }
    // Category: pakai AI suggestion dengan confidence, auto-isi jika kosong
    let catName: string | null = parsed.data.category ?? null;
    let catConf: number | null = (parsed.data as unknown as { category_confidence?: number | null }).category_confidence ?? null;
    let catReason: string | null = (parsed.data as unknown as { category_reason?: string | null }).category_reason ?? null;
    if (catName) {
      const knownCat = ctx.categories.some((c) => c.name.toLowerCase() === catName!.toLowerCase());
      if (!knownCat) {
        catName = null;
        catConf = null;
        catReason = null;
      }
    }
    // Auto-isi kategori kosong: pakai "Lain-lain" jika ada, else kategori pertama sesuai type
    if (!catName) {
      const fallback =
        ctx.categories.find((c) => c.name.toLowerCase() === "lain-lain") ??
        ctx.categories.find((c) => c.type === parsed.data.type) ??
        ctx.categories.find((c) => c.type === "both") ??
        ctx.categories[0];
      if (fallback) {
        catName = fallback.name;
        catConf = 0.55;
        catReason = "default";
      }
    }

    // Resolve IDs for confirmation save
    const supabase = createServerClient();
    const rtId = DEV_RT_ID;
    const [pRes, cRes] = await Promise.all([
      supabase.from("pockets").select("id, name").eq("rt_id", rtId),
      supabase.from("categories").select("id, name").eq("rt_id", rtId),
    ]);
    const pockets = (pRes.data as { id: string; name: string }[] | null) ?? [];
    const categories = (cRes.data as { id: string; name: string }[] | null) ?? [];
    const pocketId = pockets.length ? resolvePocketId(parsed.data.pocket, pockets) : undefined;
    const categoryId = categories.length ? resolveCategoryId(catName ?? null, categories) : null;

    return {
      type: "transaction",
      data: { ...parsed.data, category: catName ?? null, category_confidence: catConf, category_reason: catReason, pocketId, categoryId },
    };
  }

  if (raw.intent === "create_transfer") {
    const parsed = aiTransferOutputSchema.safeParse(raw);
    if (!parsed.success) {
      return { type: "error", error: parsed.error.issues.map((i) => i.message).join("; ") };
    }
    const pLow = ctx.pockets.map((p) => p.toLowerCase());
    const fromKnown = pLow.includes(parsed.data.from_pocket.toLowerCase());
    const toKnown = pLow.includes(parsed.data.to_pocket.toLowerCase());
    if (!fromKnown || !toKnown) {
      return {
        type: "needs_confirmation",
        data: {
          intent: "needs_confirmation",
          needs_confirmation: true,
          questions: ["Kantong transfer tidak dikenali. Pilih dari daftar:"],
          options: ctx.pockets,
          partial: { ...parsed.data, raw_input: input },
          confidence: 0.5,
        },
      };
    }
    if (parsed.data.from_pocket.toLowerCase() === parsed.data.to_pocket.toLowerCase()) {
      return { type: "error", error: "Kantong asal dan tujuan harus berbeda." };
    }
    const supabase = createServerClient();
    const rtId = DEV_RT_ID;
    const { data: pockets } = await supabase.from("pockets").select("id, name").eq("rt_id", rtId);
    const list = (pockets as { id: string; name: string }[] | null) ?? [];
    const fromPocketId = list.length ? resolvePocketId(parsed.data.from_pocket, list) : undefined;
    const toPocketId = list.length ? resolvePocketId(parsed.data.to_pocket, list) : undefined;
    return { type: "transfer", data: { ...parsed.data, fromPocketId, toPocketId } };
  }

  if (raw.intent === "query_balance") {
    // Should have been handled deterministic, but allow
    const q = raw as { pocket?: string; answer?: string };
    return { type: "deterministic", answer: q.answer ?? `Saldo ${q.pocket ?? "RT"}: lihat Laporan.` };
  }

  return { type: "error", error: "AI tidak memahami input. Coba tulis lebih spesifik, mis. 'Beli konsumsi 75 ribu dari Kas'." };
}
