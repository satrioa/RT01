"use client";

import Link from "next/link";
import { Wallet } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { ShaderGradientBackground, type ShaderGradientPreset } from "@/components/motion/shader-gradient-background";
import { formatRupiah } from "@/lib/format";
import type { Pocket, RtAppearanceSettings } from "@/types/database";
import { deriveGradient } from "@/lib/color";
import { GRADIENT_PRESET_MAP } from "@/lib/gradients";

export function PocketDetailHero({
  pocket,
  pocketId,
  appearance,
}: {
  pocket: (Pocket & { balance: string | number }) | null;
  pocketId: string;
  appearance: RtAppearanceSettings | null;
}) {
  const reduceMotion = useReducedMotion();

  const shaderPreset = (() => {
    const pocketPreset = pocket?.gradient_preset;
    if (pocketPreset && pocketPreset !== "custom") return pocketPreset as ShaderGradientPreset;
    if (appearance?.gradient_preset && appearance.gradient_preset !== "custom") return appearance.gradient_preset as ShaderGradientPreset;
    return "custom" as ShaderGradientPreset;
  })();

  const shaderColors = (() => {
    // Pocket has priority when custom; else global appearance
    const base = pocket?.color ?? "#111827";
    const pc1 = pocket?.gradient_c1 ?? null;
    const pc3 = pocket?.gradient_c3 ?? null;
    const pc4 = pocket?.gradient_c4 ?? null;
    const hasPocketCustom = !!(pc1 || pc3 || pc4);
    const isPocketPreset = !!(pocket?.gradient_preset && pocket.gradient_preset !== "custom");
    if (hasPocketCustom && !isPocketPreset) {
      if (pc1 && pc3 && pc4) return { c1: pc1, c2: base, c3: pc3, c4: pc4 };
      const derived = deriveGradient(base);
      return { c1: pc1 ?? derived.c1, c2: base, c3: pc3 ?? derived.c3, c4: pc4 ?? "#D2D7EC" };
    }
    if (isPocketPreset) {
      const derived = deriveGradient(base);
      if (pc1 && pc3 && pc4) return { c1: pc1, c2: base, c3: pc3, c4: pc4 };
      // preset mode: colors ignored, but provide fallback derivation
      return { c1: pc1 ?? derived.c1, c2: base, c3: pc3 ?? derived.c3, c4: pc4 ?? "#D2D7EC" };
    }
    // No pocket custom -> use global appearance if available
    if (appearance?.gradient_color1 && appearance.gradient_color2 && appearance.gradient_color3 && appearance.gradient_color4) {
      return { c1: appearance.gradient_color1, c2: appearance.gradient_color2, c3: appearance.gradient_color3, c4: appearance.gradient_color4 };
    }
    if (appearance?.gradient_color1 || appearance?.gradient_color2 || appearance?.gradient_color3 || appearance?.gradient_color4) {
      const fallback = (() => {
        const styleId = appearance?.style ?? "sunset";
        if (styleId !== "auto") {
          const p = GRADIENT_PRESET_MAP.get(styleId);
          if (p) return { c1: p.c1, c2: p.c2, c3: p.c3, c4: "#D2D7EC" };
        }
        const fb = GRADIENT_PRESET_MAP.get("sunset")!;
        return { c1: fb.c1, c2: fb.c2, c3: fb.c3, c4: "#D2D7EC" };
      })();
      return {
        c1: appearance?.gradient_color1 ?? fallback.c1,
        c2: appearance?.gradient_color2 ?? fallback.c2,
        c3: appearance?.gradient_color3 ?? fallback.c3,
        c4: appearance?.gradient_color4 ?? fallback.c4,
      };
    }
    if (pc1 && pc3) return { c1: pc1, c2: base, c3: pc3, c4: pc4 ?? "#D2D7EC" };
    const derived = deriveGradient(base);
    return { c1: derived.c1, c2: derived.c2, c3: derived.c3, c4: pc4 ?? "#D2D7EC" };
  })();
  const shaderSpeed = appearance?.gradient_speed ?? 0.14;
  const shaderBlur = appearance?.gradient_blur ?? 0.7;
  const shaderIntensity = appearance?.gradient_intensity ?? 0.95;

  return (
    <div className="relative w-full overflow-hidden rounded-4xl border border-border p-6">
      <div className="absolute inset-0">
        <ShaderGradientBackground
          preset={shaderPreset}
          color1={shaderColors.c1}
          color2={shaderColors.c2}
          color3={shaderColors.c3}
          color4={shaderColors.c4}
          speed={shaderSpeed}
          blur={shaderBlur}
          intensity={shaderIntensity}
          animationEnabled={appearance?.animation_enabled !== false}
          reducedMotion={!!reduceMotion}
          className="absolute inset-0"
        />
      </div>
      {/* Readability overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/30 via-black/15 to-black/35" />

      <div className="relative z-10">
        <p className="flex items-center gap-2 text-lg font-semibold text-white">
          <Wallet className="size-5" /> {pocket?.name ?? pocketId.slice(0, 8)}
        </p>
        <p className="mt-1 text-xs text-white/75">{pocket?.description ?? "Kantong RT"}</p>
        <p className="mt-4 text-[11px] tracking-widest text-white/70">SALDO SAAT INI</p>
        <p className="text-3xl font-bold tracking-tight text-white">
          {formatRupiah(Number(pocket?.balance ?? 0))}
        </p>
        <p className="mt-1 text-xs text-white/70">
          Saldo awal: {formatRupiah(Number(pocket?.opening_balance ?? 0))}
        </p>
        <Link href="/transactions/new?type=transfer" className="mt-3 inline-flex text-xs font-medium text-white/90 underline decoration-white/50 underline-offset-4 hover:text-white">
          Pindah Kantong →
        </Link>
      </div>
    </div>
  );
}

export function resolveSemuaGradient(appearance: RtAppearanceSettings | null) {
  if (appearance?.gradient_color1 && appearance.gradient_color2 && appearance.gradient_color3 && appearance.gradient_color4) {
    return { c1: appearance.gradient_color1, c2: appearance.gradient_color2, c3: appearance.gradient_color3, c4: appearance.gradient_color4 };
  }
  const styleId = appearance?.style ?? "sunset";
  if (styleId !== "auto") {
    const preset = GRADIENT_PRESET_MAP.get(styleId);
    if (preset) return { c1: preset.c1, c2: preset.c2, c3: preset.c3, c4: appearance?.gradient_color4 ?? "#D2D7EC" };
  }
  const fallback = GRADIENT_PRESET_MAP.get("sunset")!;
  return { c1: fallback.c1, c2: fallback.c2, c3: fallback.c3, c4: appearance?.gradient_color4 ?? "#D2D7EC" };
}
