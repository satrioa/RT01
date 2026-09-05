"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toaster";
import { saveAppearanceAction } from "@/lib/actions/appearance";
import type { RtAppearanceSettings } from "@/types/database";
import { GRADIENT_PRESETS } from "@/lib/gradients";
import { ANIMATED_GRADIENT_PRESETS, type AnimatedGradientPreset } from "@/lib/gradients";
import AnimatedGradient from "@/components/animated-gradient";
import { Palette, Sparkles, Loader2 } from "lucide-react";

const ANIMATED_PRESET_OPTIONS: { id: AnimatedGradientPreset; label: string }[] = [
  { id: "custom", label: "Custom (kombinasi bebas)" },
  { id: "Prism", label: "Prism" },
  { id: "Lava", label: "Lava" },
  { id: "Plasma", label: "Plasma" },
  { id: "Pulse", label: "Pulse" },
  { id: "Vortex", label: "Vortex" },
  { id: "Mist", label: "Mist" },
];

export function AppearanceSettings({ initial }: { initial: RtAppearanceSettings | null }) {
  const { toast } = useToast();
  const [style, setStyle] = React.useState(initial?.style ?? "sunset");
  const legacyPreset = GRADIENT_PRESETS.find((p) => p.id === (initial?.style ?? "sunset")) ?? GRADIENT_PRESETS.find((p) => p.id === "sunset")!;
  const [gradientPreset, setGradientPreset] = React.useState<AnimatedGradientPreset>(initial?.gradient_preset ?? "custom");
  const [colors, setColors] = React.useState({
    c1: initial?.gradient_color1 ?? legacyPreset.c1,
    c2: initial?.gradient_color2 ?? legacyPreset.c2,
    c3: initial?.gradient_color3 ?? legacyPreset.c3,
  });
  const [saturation, setSaturation] = React.useState(String(initial?.saturation ?? 1.1));
  const [contrast, setContrast] = React.useState(String(initial?.contrast ?? 1.6));
  const [animation, setAnimation] = React.useState(String(initial?.animation_enabled ?? true));
  const [saving, setSaving] = React.useState(false);

  const previewColors = gradientPreset === "custom" ? colors : ANIMATED_GRADIENT_PRESETS[gradientPreset];

  function handleGradientPresetChange(value: string) {
    const next = value as AnimatedGradientPreset;
    setGradientPreset(next);
    if (next !== "custom") {
      const preset = ANIMATED_GRADIENT_PRESETS[next];
      setColors({ c1: preset.c1, c2: preset.c2, c3: preset.c3 });
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData();
    fd.set("style", style);
    fd.set("gradient_preset", gradientPreset);
    fd.set("gradient_color1", colors.c1);
    fd.set("gradient_color2", colors.c2);
    fd.set("gradient_color3", colors.c3);
    fd.set("saturation", saturation);
    fd.set("contrast", contrast);
    fd.set("animation_enabled", animation);
    const res = await saveAppearanceAction(fd);
    setSaving(false);
    if (res.ok) toast({ title: "Tampilan disimpan", description: `Gaya: ${style}` });
    else toast({ title: "Gagal", description: res.error, variant: "error" });
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Palette className="size-4 text-muted-foreground" />
          <p className="text-sm font-semibold">Tampilan — Kartu</p>
          <span className="ml-auto text-[11px] text-muted-foreground">Hero + Detail</span>
        </div>

        <div className="relative isolate h-24 w-full overflow-hidden rounded-xl border bg-muted">
          <AnimatedGradient
            config={gradientPreset === "custom"
              ? { preset: "custom", color1: previewColors.c1, color2: previewColors.c2, color3: previewColors.c3, speed: 18 }
              : { preset: gradientPreset, speed: 18 }}
            noise={{ opacity: 0.04 }}
            style={{ zIndex: 0 }}
          />
        </div>
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Sparkles className="size-3" /> Preview gaya Semua — hero & detail kantong
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label>Preset Gradient</Label>
            <Select value={gradientPreset} onValueChange={handleGradientPresetChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ANIMATED_PRESET_OPTIONS.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">Pilih preset atau Custom untuk menggabungkan tiga warna sendiri.</p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(["c1", "c2", "c3"] as const).map((key, index) => (
              <label key={key} className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                Color {index + 1}
                <input
                  type="color"
                  value={colors[key]}
                  onChange={(e) => {
                    setGradientPreset("custom");
                    setColors((current) => ({ ...current, [key]: e.target.value }));
                  }}
                  className="h-10 w-full cursor-pointer rounded-lg border border-input bg-background p-1"
                  aria-label={`Gradient color ${index + 1}`}
                />
                <span className="font-mono text-[10px] uppercase">{colors[key]}</span>
              </label>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Saturation ({saturation})</Label>
              <input type="range" min={0.5} max={2} step={0.1} value={saturation} onChange={(e) => setSaturation(e.target.value)} className="w-full" />
            </div>
            <div className="space-y-2">
              <Label>Contrast ({contrast})</Label>
              <input type="range" min={0.8} max={2.5} step={0.1} value={contrast} onChange={(e) => setContrast(e.target.value)} className="w-full" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Animasi</Label>
            <Select value={animation} onValueChange={setAnimation}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Aktif</SelectItem>
                <SelectItem value="false">Nonaktif (hemat, hormati reduced-motion)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" disabled={saving} className="w-full rounded-xl">
            {saving ? <Loader2 className="size-4 animate-spin" /> : null} Simpan Tampilan
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
