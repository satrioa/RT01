"use client";

import * as React from "react";
import { Popover } from "@base-ui/react/popover";
import { Check, ChevronDown, Palette, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { GRADIENT_PRESETS, type GradientPreset } from "@/lib/gradients";
import type { GradientTriplet } from "@/lib/color";

// ---------------------------------------------------------------------------
// GradientPickerPopover — pilih tema gradien kantong via popover
// (pengganti section inline yang bikin drawer edit kantong kepanjangan)
// ---------------------------------------------------------------------------

function findMatchingPreset(color: string, c1: string | null, c3: string | null): GradientPreset | undefined {
  if (!c1 || !c3) return undefined;
  const norm = (s: string) => s.toLowerCase();
  return GRADIENT_PRESETS.find(
    (p) => norm(p.c1) === norm(c1) && norm(p.c2) === norm(color) && norm(p.c3) === norm(c3)
  );
}

export function GradientPickerPopover({
  color,
  gradientC1,
  gradientC3,
  customGradient,
  preview,
  onPresetClick,
  onCustomChange,
  onC1Change,
  onC3Change,
}: {
  color: string;
  gradientC1: string | null;
  gradientC3: string | null;
  customGradient: boolean;
  preview: GradientTriplet;
  onPresetClick: (presetId: string) => void;
  onCustomChange: (v: boolean) => void;
  onC1Change: (v: string) => void;
  onC3Change: (v: string) => void;
}) {
  const matched = customGradient ? findMatchingPreset(color, gradientC1, gradientC3) : undefined;
  const label = !customGradient ? "Otomatis" : (matched?.label ?? "Custom");

  return (
    <Popover.Root modal={false}>
      <Popover.Trigger className="flex w-full items-center gap-3 rounded-2xl border bg-card px-3 py-2.5 text-left outline-none transition hover:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary">
        <span
          className="h-8 w-16 shrink-0 overflow-hidden rounded-lg border"
          style={{ background: `linear-gradient(135deg, ${preview.c1}, ${preview.c2}, ${preview.c3})` }}
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <Palette className="size-3.5 text-muted-foreground" /> Tema Gradien
          </span>
          <span className="block truncate text-xs text-muted-foreground">{label} — tap untuk pilih</span>
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={8} className="z-[70] outline-none">
          <Popover.Popup className="w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl border bg-card p-3 shadow-xl outline-none">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold">Pilih Tema Gradien</p>
              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={customGradient}
                  onChange={(e) => onCustomChange(e.target.checked)}
                  className="rounded border"
                />
                Custom
              </label>
            </div>

            <div className="grid max-h-52 grid-cols-4 gap-2 overflow-y-auto overscroll-contain pr-0.5">
              {GRADIENT_PRESETS.map((preset) => {
                const selected = matched?.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onPresetClick(preset.id)}
                    className={cn(
                      "group flex flex-col items-center gap-1 rounded-xl border bg-card p-2 hover:border-primary/50",
                      selected && "border-primary ring-1 ring-primary"
                    )}
                    title={`${preset.label} — ${preset.character}`}
                  >
                    <span className="flex h-6 w-full gap-0.5 overflow-hidden rounded-full">
                      <span className="flex-1" style={{ background: preset.c1 }} />
                      <span className="flex-1" style={{ background: preset.c2 }} />
                      <span className="flex-1" style={{ background: preset.c3 }} />
                    </span>
                    <span className="flex items-center gap-0.5 text-[10px] font-medium">
                      {selected && <Check className="size-3 text-primary" />}
                      {preset.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {customGradient ? (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Ujung terang (c1)</p>
                  <input
                    type="color"
                    value={gradientC1 ?? "#f9f9ff"}
                    onChange={(e) => onC1Change(e.target.value)}
                    className="h-10 w-full cursor-pointer rounded-xl border bg-transparent p-1"
                    aria-label="Warna ujung terang"
                  />
                  <p className="font-mono text-[10px] text-muted-foreground">{gradientC1 ?? "-"}</p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Ujung gelap (c3)</p>
                  <input
                    type="color"
                    value={gradientC3 ?? "#d2e3ff"}
                    onChange={(e) => onC3Change(e.target.value)}
                    className="h-10 w-full cursor-pointer rounded-xl border bg-transparent p-1"
                    aria-label="Warna ujung gelap"
                  />
                  <p className="font-mono text-[10px] text-muted-foreground">{gradientC3 ?? "-"}</p>
                </div>
              </div>
            ) : null}

            <div className="mt-3 space-y-1">
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Sparkles className="size-3" /> Preview
              </p>
              <div
                className="h-12 w-full overflow-hidden rounded-xl border"
                style={{ background: `linear-gradient(135deg, ${preview.c1}, ${preview.c2}, ${preview.c3})` }}
              />
              <p className="text-[10px] text-muted-foreground">
                Tanpa custom, warna otomatis dari warna tengah via HSL.
              </p>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
