"use client";

import Link from "next/link";
import { Wallet } from "lucide-react";
import { useReducedMotion } from "motion/react";
import Grainient from "@/components/motion/grainient";
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

  const colors = (() => {
    if (appearance?.gradient_color1 && appearance.gradient_color2 && appearance.gradient_color3) {
      return { c1: appearance.gradient_color1, c2: appearance.gradient_color2, c3: appearance.gradient_color3 };
    }
    const base = pocket?.color ?? "#111827";
    const c1 = pocket?.gradient_c1 ?? null;
    const c3 = pocket?.gradient_c3 ?? null;
    if (c1 && c3) return { c1, c2: base, c3 };
    return deriveGradient(base);
  })();

  const timeSpeed = appearance?.animation_enabled === false || reduceMotion ? 0 : 0.18;
  const gradientPreset = appearance?.gradient_preset && appearance.gradient_preset !== "custom"
    ? appearance.gradient_preset
    : undefined;

  return (
    <div className="relative w-full overflow-hidden rounded-4xl border border-border p-6">
      <div className="absolute inset-0">
        <Grainient
          color1={colors.c1}
          color2={colors.c2}
          color3={colors.c3}
          timeSpeed={timeSpeed}
          warpStrength={0.7}
          warpFrequency={4.5}
          warpSpeed={1.6}
          grainAmount={0.04}
          grainAnimated={false}
          contrast={appearance?.contrast ?? 1.6}
          saturation={appearance?.saturation ?? 1.1}
           zoom={0.85}
           lightMode
           preset={gradientPreset}
           className="opacity-90"
        />
         <div className="absolute inset-0 bg-white/15 backdrop-blur-[0.5px] dark:bg-zinc-900/25" />
      </div>

      <div className="relative z-10">
        <p className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Wallet className="size-5" /> {pocket?.name ?? pocketId.slice(0, 8)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{pocket?.description ?? "Kantong RT"}</p>
        <p className="mt-4 text-[11px] tracking-widest text-muted-foreground">SALDO SAAT INI</p>
        <p className="text-3xl font-bold tracking-tight text-foreground">
          {formatRupiah(Number(pocket?.balance ?? 0))}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Saldo awal: {formatRupiah(Number((pocket as unknown as { opening_balance?: string | number } | null)?.opening_balance ?? 0))}
        </p>
        <Link href="/transactions/new?type=transfer" className="mt-3 inline-flex text-xs font-medium text-primary underline">
          Pindah Kantong →
        </Link>
      </div>
    </div>
  );
}

export function resolveSemuaGradient(appearance: RtAppearanceSettings | null) {
  const styleId = appearance?.style ?? "sunset";
  if (styleId !== "auto") {
    const preset = GRADIENT_PRESET_MAP.get(styleId);
    if (preset) return { c1: preset.c1, c2: preset.c2, c3: preset.c3 };
  }
  const fallback = GRADIENT_PRESET_MAP.get("sunset")!;
  return { c1: fallback.c1, c2: fallback.c2, c3: fallback.c3 };
}
