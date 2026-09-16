"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { getCurrentRtId, requireWriteRole } from "@/lib/auth";
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
const ALLOWED_GRADIENT_PRESETS = new Set(["custom", "Prism", "Lava", "Plasma", "Pulse", "Vortex", "Mist"]);

export async function getAppearanceSettings(): Promise<RtAppearanceSettings | null> {
  const rtId = await getCurrentRtId().catch(() => null);
  if (!rtId) return null;
  const supabase = createServerClient();
  const { data } = await supabase.from("rt_appearance_settings").select("*").eq("rt_id", rtId).maybeSingle();
  return (data as RtAppearanceSettings | null) ?? null;
}

export type AppearanceActionResult = { ok: boolean; error?: string };

export async function saveAppearanceAction(formData: FormData): Promise<AppearanceActionResult> {
  const denied = await requireWriteRole();
  if (denied) return denied;
  const rtId = await getCurrentRtId();
  const supabase = createServerClient();

  const style = String(formData.get("style") ?? "sunset").trim().toLowerCase();
  const gradient_preset = String(formData.get("gradient_preset") ?? "custom").trim();
  const gradient_color1 = String(formData.get("gradient_color1") ?? "").trim();
  const gradient_color2 = String(formData.get("gradient_color2") ?? "").trim();
  const gradient_color3 = String(formData.get("gradient_color3") ?? "").trim();
  const gradient_color4 = String(formData.get("gradient_color4") ?? "#D2D7EC").trim();
  const gradient_speed = Number(formData.get("gradient_speed") ?? 0.14);
  const gradient_blur = Number(formData.get("gradient_blur") ?? 0.7);
  const gradient_intensity = Number(formData.get("gradient_intensity") ?? 0.95);
  const saturation = Number(formData.get("saturation") ?? 1.1);
  const contrast = Number(formData.get("contrast") ?? 1.6);
  const animation_enabled = formData.get("animation_enabled") !== "false" && formData.get("animation_enabled") !== "off";

  if (!ALLOWED_STYLES.has(style)) return { ok: false, error: "Style tidak valid" };
  if (!ALLOWED_GRADIENT_PRESETS.has(gradient_preset)) return { ok: false, error: "Preset gradient tidak valid" };
  for (const color of [gradient_color1, gradient_color2, gradient_color3, gradient_color4]) {
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) return { ok: false, error: "Semua warna harus format HEX 6 digit" };
  }
  if (!Number.isFinite(gradient_speed) || gradient_speed < 0 || gradient_speed > 2) return { ok: false, error: "Speed 0-2" };
  if (!Number.isFinite(gradient_blur) || gradient_blur < 0 || gradient_blur > 2) return { ok: false, error: "Blur 0-2" };
  if (!Number.isFinite(gradient_intensity) || gradient_intensity < 0 || gradient_intensity > 2) return { ok: false, error: "Intensity 0-2" };
  if (!Number.isFinite(saturation) || saturation < 0.5 || saturation > 2.0) return { ok: false, error: "Saturation 0.5-2.0" };
  if (!Number.isFinite(contrast) || contrast < 0.8 || contrast > 2.5) return { ok: false, error: "Contrast 0.8-2.5" };

  const { error } = await supabase.from("rt_appearance_settings").upsert(
    {
      rt_id: rtId,
      style,
      gradient_preset,
      gradient_color1,
      gradient_color2,
      gradient_color3,
      gradient_color4,
      gradient_speed,
      gradient_blur,
      gradient_intensity,
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
