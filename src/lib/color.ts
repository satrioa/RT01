/** Color helpers for pocket gradient elaboration (1 base → 3). */

export function isHexColor(s: string | null | undefined): s is string {
  return typeof s === "string" && /^#[0-9a-fA-F]{6}$/.test(s.trim());
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return null;
  const r = parseInt(m[1], 16) / 255;
  const g = parseInt(m[2], 16) / 255;
  const b = parseInt(m[3], 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = clamp(s, 0, 100);
  l = clamp(l, 0, 100);
  const hh = h / 360;
  const ss = s / 100;
  const ll = l / 100;
  let r: number, g: number, b: number;
  if (ss === 0) {
    r = g = b = ll;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
    const p = 2 * ll - q;
    r = hue2rgb(p, q, hh + 1 / 3);
    g = hue2rgb(p, q, hh);
    b = hue2rgb(p, q, hh - 1 / 3);
  }
  const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toLowerCase();
}

/** Lighten toward white by increasing L. amt 0-100. */
export function lighten(hex: string, amt: number): string {
  const hsl = hexToHsl(hex);
  if (!hsl) return hex;
  return hslToHex(hsl.h, hsl.s, clamp(hsl.l + amt, 0, 100));
}

/** Darken. */
export function darken(hex: string, amt: number): string {
  const hsl = hexToHsl(hex);
  if (!hsl) return hex;
  return hslToHex(hsl.h, hsl.s, clamp(hsl.l - amt, 0, 100));
}

/** Shift hue by deg. */
export function shiftHue(hex: string, deg: number): string {
  const hsl = hexToHsl(hex);
  if (!hsl) return hex;
  return hslToHex(hsl.h + deg, hsl.s, hsl.l);
}

export type GradientTriplet = { c1: string; c2: string; c3: string };

const FALLBACK: GradientTriplet = { c1: "#f9f9ff", c2: "#5697ff", c3: "#d2e3ff" };

/**
 * Derive 3-stop gradient from single base color.
 * c2 = base (identity preserved), c1 = light, c3 = deep analogous.
 */
export function deriveGradient(base: string | null | undefined): GradientTriplet {
  if (!isHexColor(base ?? "")) return FALLBACK;
  const hex = (base as string).trim().toLowerCase();
  const hsl = hexToHsl(hex);
  if (!hsl) return { c1: lighten(hex, 38), c2: hex, c3: darken(shiftHue(hex, 18), 22) };
  // c1: L+38 toward white (clamp 92), keep H/S
  const c1 = hslToHex(hsl.h, clamp(hsl.s * 0.7, 0, 100), clamp(hsl.l + 38, 0, 92));
  // c3: L-22 + H+18 (analogous deep)
  const c3HslL = clamp(hsl.l - 22, 12, 100);
  const c3 = hslToHex((hsl.h + 18) % 360, clamp(hsl.s * 1.05, 0, 100), c3HslL);
  return { c1: c1.toLowerCase(), c2: hex, c3: c3.toLowerCase() };
}

export function normalizeHex(hex: string): string | null {
  const t = hex.trim().toLowerCase();
  return isHexColor(t) ? t : null;
}
