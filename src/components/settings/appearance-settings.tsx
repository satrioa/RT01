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
import { Palette, Sparkles, Loader2 } from "lucide-react";

const STYLE_OPTIONS = [
  { id: "auto", label: "Otomatis kantong" },
  { id: "sunset", label: "Sunset (default Semua)" },
  { id: "pastel", label: "Pastel" },
  { id: "blue_ocean", label: "Blue Ocean" },
  { id: "red_bloom", label: "Red Bloom" },
  { id: "purple_dream", label: "Purple Dream" },
  { id: "forest", label: "Forest" },
  { id: "mint", label: "Mint" },
  { id: "peach", label: "Peach" },
  { id: "lavender", label: "Lavender" },
  { id: "rose", label: "Rose" },
  { id: "sky", label: "Sky" },
  { id: "aurora", label: "Aurora" },
  { id: "cyber", label: "Cyber" },
  { id: "midnight", label: "Midnight" },
  { id: "obsidian", label: "Obsidian" },
  { id: "coffee", label: "Coffee" },
  { id: "candy", label: "Candy" },
  { id: "lime", label: "Lime" },
  { id: "coral", label: "Coral" },
  { id: "ice", label: "Ice" },
  { id: "biru_rt", label: "Biru RT (legacy)" },
];

export function AppearanceSettings({ initial }: { initial: RtAppearanceSettings | null }) {
  const { toast } = useToast();
  const [style, setStyle] = React.useState(initial?.style ?? "sunset");
  const [saturation, setSaturation] = React.useState(String(initial?.saturation ?? 1.1));
  const [contrast, setContrast] = React.useState(String(initial?.contrast ?? 1.6));
  const [animation, setAnimation] = React.useState(String(initial?.animation_enabled ?? true));
  const [saving, setSaving] = React.useState(false);

  const preset = GRADIENT_PRESETS.find((p) => p.id === style);
  const previewStyle = preset
    ? { background: `linear-gradient(135deg, ${preset.c1}, ${preset.c2}, ${preset.c3})` }
    : style === "auto"
      ? { background: "linear-gradient(135deg, #f9f9ff, #5697ff, #d2e3ff)" }
      : style === "biru_rt"
        ? { background: "linear-gradient(135deg, #f9f9ff, #5697ff, #d2e3ff)" }
        : {};

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData();
    fd.set("style", style);
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

        <div className="h-16 w-full overflow-hidden rounded-xl border" style={previewStyle as React.CSSProperties} />
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Sparkles className="size-3" /> Preview gaya Semua — hero & detail kantong
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label>Gaya Semua</Label>
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STYLE_OPTIONS.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">Auto = ikut warna kantong, preset = paksa 3 warna preset untuk Semua.</p>
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
