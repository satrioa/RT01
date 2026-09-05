import type { GradientTriplet } from "./color";

export type GradientPreset = {
  id: string;
  label: string;
  c1: string;
  c2: string;
  c3: string;
  character: string;
};

export const GRADIENT_PRESETS: GradientPreset[] = [
  { id: "pastel", label: "Pastel", c1: "#FFD6E7", c2: "#D9E8FF", c3: "#D9F7E8", character: "Soft, playful" },
  { id: "blue_ocean", label: "Blue Ocean", c1: "#0EA5E9", c2: "#2563EB", c3: "#172554", character: "Deep, cool" },
  { id: "red_bloom", label: "Red Bloom", c1: "#FDA4AF", c2: "#EF4444", c3: "#7F1D1D", character: "Warm, dramatic" },
  { id: "purple_dream", label: "Purple Dream", c1: "#E9D5FF", c2: "#A855F7", c3: "#4C1D95", character: "Dreamy, creative" },
  { id: "sunset", label: "Sunset", c1: "#FDE68A", c2: "#FB7185", c3: "#7C3AED", character: "Vibrant sunset" },
  { id: "forest", label: "Forest", c1: "#BBF7D0", c2: "#22C55E", c3: "#14532D", character: "Natural, fresh" },
  { id: "mint", label: "Mint", c1: "#CCFBF1", c2: "#2DD4BF", c3: "#0F766E", character: "Clean, refreshing" },
  { id: "peach", label: "Peach", c1: "#FFE4C7", c2: "#FB923C", c3: "#C2410C", character: "Warm, friendly" },
  { id: "lavender", label: "Lavender", c1: "#EDE9FE", c2: "#C4B5FD", c3: "#6D28D9", character: "Calm, elegant" },
  { id: "rose", label: "Rose", c1: "#FCE7F3", c2: "#F472B6", c3: "#9D174D", character: "Elegant, feminine" },
  { id: "sky", label: "Sky", c1: "#E0F2FE", c2: "#38BDF8", c3: "#0369A1", character: "Light, airy" },
  { id: "aurora", label: "Aurora", c1: "#A7F3D0", c2: "#67E8F9", c3: "#8B5CF6", character: "Futuristic" },
  { id: "cyber", label: "Cyber", c1: "#22D3EE", c2: "#6366F1", c3: "#D946EF", character: "Neon, energetic" },
  { id: "midnight", label: "Midnight", c1: "#312E81", c2: "#1E1B4B", c3: "#020617", character: "Dark, premium" },
  { id: "obsidian", label: "Obsidian", c1: "#52525B", c2: "#27272A", c3: "#09090B", character: "Minimal, luxury" },
  { id: "coffee", label: "Coffee", c1: "#FED7AA", c2: "#A16207", c3: "#451A03", character: "Warm, earthy" },
  { id: "candy", label: "Candy", c1: "#F9A8D4", c2: "#C084FC", c3: "#60A5FA", character: "Fun, colorful" },
  { id: "lime", label: "Lime", c1: "#D9F99D", c2: "#84CC16", c3: "#365314", character: "Fresh, energetic" },
  { id: "coral", label: "Coral", c1: "#FED7AA", c2: "#FB7185", c3: "#BE123C", character: "Tropical" },
  { id: "ice", label: "Ice", c1: "#E0F2FE", c2: "#BAE6FD", c3: "#64748B", character: "Cool, subtle" },
];

export const GRADIENT_PRESET_MAP = new Map(GRADIENT_PRESETS.map((p) => [p.id, p]));

export const DEFAULT_PRESET_ID = "sunset";
export const DEFAULT_PRESET = GRADIENT_PRESET_MAP.get(DEFAULT_PRESET_ID)!;

// Legacy biru RT (fallback Semua sebelum preset)
export const BIRU_RT: GradientTriplet = { c1: "#f9f9ff", c2: "#5697ff", c3: "#d2e3ff" };

export function getPreset(id: string | null | undefined): GradientPreset | undefined {
  if (!id) return undefined;
  return GRADIENT_PRESET_MAP.get(id);
}

export function applyPresetToPocket(preset: GradientPreset): { color: string; gradient_c1: string; gradient_c3: string } {
  return { color: preset.c2.toLowerCase(), gradient_c1: preset.c1.toLowerCase(), gradient_c3: preset.c3.toLowerCase() };
}
