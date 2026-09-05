"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentRtId } from "@/lib/auth";
import { AI_PROVIDERS, DEFAULT_MODEL, DEFAULT_PROVIDER } from "@/lib/ai/models";
import type { AiProviderId, RtAiSettings } from "@/types/database";

const saveSchema = z.object({
  provider: z.enum(["openrouter", "openai", "anthropic", "mock"]),
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
    if (svcData) return svcData as unknown as RtAiSettings;
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
  return data as unknown as RtAiSettings;
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

  const rtId = await getCurrentRtId();
  const supabase = createServiceClient(); // service to bypass RLS for upsert

  const { error } = await supabase.from("rt_ai_settings").upsert(
    {
      rt_id: rtId,
      provider: parsed.data.provider as AiProviderId,
      model: parsed.data.model,
      is_enabled: parsed.data.is_enabled ?? true,
    },
    { onConflict: "rt_id" }
  );

  if (error) return { ok: false, error: error.message };

  revalidatePath("/pengaturan");
  return { ok: true };
}

export async function getEnvKeyStatus(): Promise<Record<string, boolean>> {
  return {
    OPENROUTER_API_KEY: !!process.env.OPENROUTER_API_KEY,
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
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
  };
  const apiKey = envKeyMap[provider];
  if (!apiKey) return { ok: false, error: `API key ${envKeyMap[provider] ? "" : "tidak"} ditemukan — set di .env` };

  const { OpenRouterProvider } = await import("@/lib/ai/openrouter");
  const start = Date.now();
  try {
    const prov = new OpenRouterProvider(apiKey, model);
    await prov.parse("test", { pockets: ["Kas"], categories: [{ name: "Iuran Warga", type: "income" as const }], currentDate: new Date().toISOString().slice(0, 10) });
    return { ok: true, ms: Date.now() - start };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, error: msg.slice(0, 300), ms: Date.now() - start };
  }
}
