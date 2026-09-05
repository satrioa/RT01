"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentRtId } from "@/lib/auth";
import { AI_PROVIDERS, DEFAULT_MODEL, DEFAULT_PROVIDER } from "@/lib/ai/models";
import type { AiProviderId, RtAiSettings } from "@/types/database";

const saveSchema = z.object({
  provider: z.enum(["openrouter", "openai", "anthropic", "gemini", "mock"]),
  model: z.string().min(1).max(100),
  is_enabled: z.boolean().optional().default(true),
});

export async function getAiSettings(): Promise<RtAiSettings | null> {
  const rtId = await getCurrentRtId();
  // Use service to bypass RLS when anon (dev), but prefer server client with RLS
  const supabase = createServerClient();
  const { data, error } = await supabase.from("rt_ai_settings").select("*").eq("rt_id", rtId).maybeSingle();
  if (error || !data) {
    // Fallback to service + env defaults
    const svc = createServiceClient();
    const { data: svcData } = await svc.from("rt_ai_settings").select("*").eq("rt_id", rtId).maybeSingle();
    if (svcData) {
      // auto-migrate deprecated model on read
      const row = svcData as unknown as RtAiSettings;
      const map: Record<string, string> = {
        "models/gemini-2.5-flash": "gemini-3.6-flash",
        "models/gemini-2.5-flash-lite": "gemini-3.6-flash",
        "gemini-2.5-flash": "gemini-3.6-flash",
        "gemini-2.0-flash-001": "gemini-3.6-flash",
        "google/gemini-2.5-flash": "google/gemini-3.6-flash",
      };
      if (map[row.model]) {
        row.model = map[row.model];
      }
      return row as unknown as RtAiSettings;
    }
    return {
      id: "env-default",
      rt_id: rtId,
      provider: DEFAULT_PROVIDER,
      model: process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL,
      is_enabled: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as RtAiSettings;
  }
  const row = data as unknown as RtAiSettings;
  const map: Record<string, string> = {
    "models/gemini-2.5-flash": "gemini-3.6-flash",
    "models/gemini-2.5-flash-lite": "gemini-3.6-flash",
    "gemini-2.5-flash": "gemini-3.6-flash",
    "gemini-2.0-flash-001": "gemini-3.6-flash",
    "google/gemini-2.5-flash": "google/gemini-3.6-flash",
  };
  if (map[row.model]) {
    row.model = map[row.model];
  }
  return row as unknown as RtAiSettings;
}

export async function saveAiSettingsAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const raw = {
    provider: formData.get("provider") as string,
    model: formData.get("model") as string,
    is_enabled: formData.get("is_enabled") === "true" || formData.get("is_enabled") === "on",
  };
  const parsed = saveSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  const providerOpt = AI_PROVIDERS.find((p) => p.id === parsed.data.provider);
  if (!providerOpt) return { ok: false, error: "Provider tidak dikenal" };
  // Allow custom model IDs (e.g. gemini variants not yet in list) — jangan force ke openrouter
  // Jika model tidak ada di daftar, tetap simpan; hanya beri warning di log
  const modelOk = providerOpt.models.some((m) => m.id === parsed.data.model);
  if (!modelOk) {
    console.warn(`[ai-settings] custom model "${parsed.data.model}" untuk ${parsed.data.provider} tidak ada di daftar — tetap disimpan`);
  }

  // Auto-migrate deprecated gemini models (404) → latest
  const deprecatedModelMap: Record<string, string> = {
    "models/gemini-2.5-flash": "gemini-3.6-flash",
    "models/gemini-2.5-flash-lite": "gemini-3.6-flash",
    "models/gemini-2.0-flash-001": "gemini-3.6-flash",
    "models/gemini-2.0-flash": "gemini-3.6-flash",
    "gemini-2.5-flash": "gemini-3.6-flash",
    "gemini-2.5-flash-lite": "gemini-3.6-flash",
    "gemini-2.0-flash-001": "gemini-3.6-flash",
    "gemini-2.0-flash": "gemini-3.6-flash",
    "google/gemini-2.5-flash": "google/gemini-3.6-flash",
    "google/gemini-2.0-flash-001": "google/gemini-3.6-flash",
  };
  const migratedModel = deprecatedModelMap[parsed.data.model] ?? parsed.data.model;
  if (migratedModel !== parsed.data.model) {
    console.warn(`[ai-settings] auto-migrate model ${parsed.data.model} → ${migratedModel}`);
  }

  const rtId = await getCurrentRtId();
  const supabase = createServiceClient(); // service to bypass RLS for upsert

  const { error } = await supabase.from("rt_ai_settings").upsert(
    {
      rt_id: rtId,
      provider: parsed.data.provider as AiProviderId,
      model: migratedModel,
      is_enabled: parsed.data.is_enabled ?? true,
    },
    { onConflict: "rt_id" }
  );

  if (error) {
    // Handle check constraint not yet migrated (provider gemini not in DB)
    if (error.message.includes("rt_ai_settings_provider_check") || error.message.includes("violates check constraint")) {
      return {
        ok: false,
        error:
          "Database belum izinkan provider 'gemini'. Jalankan di Supabase SQL Editor: " +
          "alter table public.rt_ai_settings drop constraint if exists rt_ai_settings_provider_check; " +
          "alter table public.rt_ai_settings add constraint rt_ai_settings_provider_check check (provider in ('openrouter','openai','anthropic','gemini','mock')); " +
          "Atau jalankan file supabase/migrations/009_add_gemini_provider.sql",
      };
    }
    // Handle model deprecation 404 guidance
    if (error.message.includes("models/gemini-2.5-flash")) {
      return { ok: false, error: "Model gemini-2.5-flash sudah deprecated (404). Pilih gemini-3.6-flash di Pengaturan → Simpan, lalu coba lagi." };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/pengaturan");
  return { ok: true };
}

export async function getEnvKeyStatus(): Promise<Record<string, boolean>> {
  return {
    OPENROUTER_API_KEY: !!process.env.OPENROUTER_API_KEY,
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    GEMINI_API_KEY: !!(process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY),
    GOOGLE_API_KEY: !!(process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY),
  };
}

export async function testAiConnectionAction(formData: FormData): Promise<{ ok: boolean; error?: string; ms?: number }> {
  const provider = formData.get("provider") as string;
  const model = formData.get("model") as string;

  if (provider === "mock") {
    return { ok: true, ms: 0 };
  }

  const envKeyMap: Record<string, string | undefined> = {
    openrouter: process.env.OPENROUTER_API_KEY,
    openai: process.env.OPENAI_API_KEY ?? process.env.OPENROUTER_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY ?? process.env.OPENROUTER_API_KEY,
    gemini: process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY,
    google: process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY,
  };
  const apiKey = envKeyMap[provider];
  if (!apiKey) return { ok: false, error: `API key tidak ditemukan — set ${provider === "gemini" || provider === "google" ? "GEMINI_API_KEY" : provider === "openai" ? "OPENAI_API_KEY" : provider === "anthropic" ? "ANTHROPIC_API_KEY" : "OPENROUTER_API_KEY"} di .env` };

  const start = Date.now();
  try {
    if (provider === "gemini" || provider === "google") {
      const { GeminiProvider } = await import("@/lib/ai/gemini");
      const prov = new GeminiProvider(apiKey, model);
      await prov.parse("test", { pockets: ["Kas"], categories: [{ name: "Iuran Warga", type: "income" as const }], currentDate: new Date().toISOString().slice(0, 10) });
      return { ok: true, ms: Date.now() - start };
    }
    const { OpenRouterProvider } = await import("@/lib/ai/openrouter");
    const prov = new OpenRouterProvider(apiKey, model);
    await prov.parse("test", { pockets: ["Kas"], categories: [{ name: "Iuran Warga", type: "income" as const }], currentDate: new Date().toISOString().slice(0, 10) });
    return { ok: true, ms: Date.now() - start };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, error: msg.slice(0, 300), ms: Date.now() - start };
  }
}
