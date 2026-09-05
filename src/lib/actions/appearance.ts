"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { getCurrentRtId } from "@/lib/auth";
import type { RtAppearanceSettings } from "@/types/database";

const ALLOWED_STYLES = new Set([
  "auto",
  "biru_rt",
  "pastel",
  "blue_ocean",
  "red_bloom",
  "purple_dream",
  "sunset",
  "forest",
  "mint",
  "peach",
  "lavender",
  "rose",
  "sky",
  "aurora",
  "cyber",
  "midnight",
  "obsidian",
  "coffee",
  "candy",
  "lime",
  "coral",
  "ice",
]);

export async function getAppearanceSettings(): Promise<RtAppearanceSettings | null> {
  const rtId = await getCurrentRtId().catch(() => null);
  if (!rtId) return null;
  const supabase = createServerClient();
  const { data } = await supabase.from("rt_appearance_settings").select("*").eq("rt_id", rtId).maybeSingle();
  return (data as RtAppearanceSettings | null) ?? null;
}

export type AppearanceActionResult = { ok: boolean; error?: string };

export async function saveAppearanceAction(formData: FormData): Promise<AppearanceActionResult> {
  const rtId = await getCurrentRtId();
  const supabase = createServerClient();

  const style = String(formData.get("style") ?? "sunset").trim().toLowerCase();
  const saturation = Number(formData.get("saturation") ?? 1.1);
  const contrast = Number(formData.get("contrast") ?? 1.6);
  const animation_enabled = formData.get("animation_enabled") !== "false" && formData.get("animation_enabled") !== "off";

  if (!ALLOWED_STYLES.has(style)) return { ok: false, error: "Style tidak valid" };
  if (!Number.isFinite(saturation) || saturation < 0.5 || saturation > 2.0) return { ok: false, error: "Saturation 0.5-2.0" };
  if (!Number.isFinite(contrast) || contrast < 0.8 || contrast > 2.5) return { ok: false, error: "Contrast 0.8-2.5" };

  const { error } = await supabase.from("rt_appearance_settings").upsert(
    {
      rt_id: rtId,
      style,
      saturation,
      contrast,
      animation_enabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "rt_id" }
  );

  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/pengaturan");
  revalidatePath(`/pockets/${rtId}`);
  return { ok: true };
}
