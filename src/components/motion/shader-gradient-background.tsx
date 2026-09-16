"use client";

import type { CSSProperties } from "react";
import { ShaderGradient } from "@/components/ui/shader-gradient";
import { cn } from "@/lib/utils";

// Keep preset names compatible with existing ANIMATED_GRADIENT_PRESETS
export type ShaderGradientPreset = "custom" | "Prism" | "Lava" | "Plasma" | "Pulse" | "Vortex" | "Mist";

/**
 * Old presets were 3 colors (c1,c2,c3). ShaderGradient needs 4.
 * Each entry extends the legacy triplet with a 4th harmonious wash
 * so there is no bare middle or single-hue flat spot.
 */
export const SHADER_GRADIENT_PRESET_COLORS: Record<
  Exclude<ShaderGradientPreset, "custom">,
  [string, string, string, string]
> = {
  // Prism — light prism sweep (FAFAFA / 66B3FF / 050505) + lavender veil for depth
  Prism: ["#FAFAFA", "#66B3FF", "#050505", "#D2D7EC"],
  // Lava — hot orange/red + pale paper lift + soft amber tail
  Lava: ["#FF9F21", "#FF0303", "#FAFAFA", "#FFD6A0"],
  // Plasma — violet burst + two paper washes + light lavender lift
  Plasma: ["#B566FF", "#FAFAFA", "#FAFAFA", "#E9D5FF"],
  // Pulse — acid green pulse + paper + mint tail
  Pulse: ["#66FF85", "#FAFAFA", "#FAFAFA", "#A7F3D0"],
  // Vortex — high-contrast black/white vortex + subtle sage & lavender washes
  Vortex: ["#FAFAFA", "#000000", "#FAFAFA", "#B4D8C4"],
  // Mist — soft pink mist + paper + lavender haze
  Mist: ["#FAFAFA", "#FF66B8", "#FAFAFA", "#E9D5FF"],
};

export type ShaderGradientBackgroundProps = {
  preset?: ShaderGradientPreset;
  color1?: string;
  color2?: string;
  color3?: string;
  color4?: string;
  speed?: number;
  blur?: number;
  intensity?: number;
  animationEnabled?: boolean;
  reducedMotion?: boolean;
  className?: string;
  style?: CSSProperties;
  interactive?: boolean;
  theme?: "light" | "dark" | "auto";
};

/**
 * Centralized adapter over @23rd/shader-gradient.
 *
 * - When preset !== "custom" uses the mapped 4-color preset (ignores color1-4).
 * - When preset === "custom" uses provided colors (falls back to Prism's defaults).
 * - Respects animationEnabled + reducedMotion by forcing speed to 0.
 * - No white overlay — consumers add readability layers if needed.
 * - Forwards className/style to the underlying wash.
 */
export function ShaderGradientBackground({
  preset = "custom",
  color1,
  color2,
  color3,
  color4,
  speed = 0.14,
  blur = 0.7,
  intensity = 0.95,
  animationEnabled = true,
  reducedMotion = false,
  className,
  style,
  interactive = true,
  theme = "auto",
}: ShaderGradientBackgroundProps) {
  const isCustom = preset === "custom";

  const colors: string[] = (() => {
    if (!isCustom) {
      return [...SHADER_GRADIENT_PRESET_COLORS[preset as Exclude<ShaderGradientPreset, "custom">]];
    }
    // Custom: use supplied colors, fallback to Prism base so we always have 4
    const fallback = SHADER_GRADIENT_PRESET_COLORS.Prism;
    return [
      color1 ?? fallback[0],
      color2 ?? fallback[1],
      color3 ?? fallback[2],
      color4 ?? fallback[3],
    ];
  })();

  const effectiveSpeed = !animationEnabled || reducedMotion ? 0 : speed;
  const effectiveInteractive = !animationEnabled || reducedMotion ? false : interactive;

  // ShaderGradient already renders absolute inset-0 with pointer-events-none.
  // It does not expose a style prop, so when callers pass style we wrap
  // without adding any white overlay.
  if (style) {
    return (
      <div style={style} className={cn("absolute inset-0 overflow-hidden", className)}>
        <ShaderGradient
          colors={colors}
          speed={effectiveSpeed}
          blur={blur}
          intensity={intensity}
          interactive={effectiveInteractive}
          theme={theme}
          className="absolute inset-0"
        />
      </div>
    );
  }

  return (
    <ShaderGradient
      colors={colors}
      speed={effectiveSpeed}
      blur={blur}
      intensity={intensity}
      interactive={effectiveInteractive}
      theme={theme}
      className={cn(className)}
    />
  );
}

export default ShaderGradientBackground;
