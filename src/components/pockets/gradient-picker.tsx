"use client";

import * as React from "react";
import { Check, ChevronDown, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import { ANIMATED_GRADIENT_PRESETS, GRADIENT_PRESETS, type GradientPreset } from "@/lib/gradients";

// ---------------------------------------------------------------------------
// GradientPicker — inline collapsible (tanpa portal/popover).
// Alasan: Popover (portal) di dalam Vaul Drawer yang modal tidak bisa
// diklik — Vaul mengunci pointer/focus di dalam drawer. Inline collapsible
// selalu bisa diklik dan membuat drawer tetap pendek (collapsed default).
// Preset grid tetap inline agar aman digunakan di dalam Vaul Drawer.
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
  onPresetClick,
}: {
  color: string;
  gradientC1: string | null;
  gradientC3: string | null;
  customGradient: boolean;
  preview?: unknown;
  onPresetClick: (presetId: string) => void;
  onCustomChange?: (v: boolean) => void;
  onC1Change?: (v: string) => void;
  onC3Change?: (v: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const matched = customGradient ? findMatchingPreset(color, gradientC1, gradientC3) : undefined;
  const label = !customGradient ? "Otomatis" : (matched?.label ?? "Custom");

  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left outline-none transition hover:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary"
      >
        <span
          className="h-8 w-16 shrink-0 overflow-hidden rounded-lg border"
          style={{
            background: `linear-gradient(135deg, ${gradientC1 ?? color}, ${color}, ${gradientC3 ?? color})`,
          }}
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <Palette className="size-3.5 text-muted-foreground" /> Tema Gradien
          </span>
          <span className="block truncate text-xs text-muted-foreground">{label} — tap untuk pilih</span>
        </span>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="border-t p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Animated Gradient</p>
          <div className="mb-3 grid grid-cols-3 gap-2">
            {(Object.entries(ANIMATED_GRADIENT_PRESETS) as [string, { c1: string; c2: string; c3: string }][]).map(([id, preset]) => {
              const selected = gradientC1?.toLowerCase() === preset.c1.toLowerCase()
                && color.toLowerCase() === preset.c2.toLowerCase()
                && gradientC3?.toLowerCase() === preset.c3.toLowerCase();
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    onPresetClick(id);
                    setOpen(false);
                  }}
                  className={cn(
                    "group flex flex-col items-center gap-1 rounded-xl border bg-card p-2 hover:border-primary/50",
                    selected && "border-primary ring-1 ring-primary"
                  )}
                  title={`${id} animated gradient`}
                >
                  <span className="flex h-6 w-full gap-0.5 overflow-hidden rounded-full">
                    <span className="flex-1" style={{ background: preset.c1 }} />
                    <span className="flex-1" style={{ background: preset.c2 }} />
                    <span className="flex-1" style={{ background: preset.c3 }} />
                  </span>
                  <span className="flex items-center gap-0.5 text-[10px] font-medium">
                    {selected && <Check className="size-3 text-primary" />}
                    {id}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Tema Pocket</p>
          <div className="grid max-h-44 grid-cols-4 gap-2 overflow-y-auto overscroll-contain pr-0.5 [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none]">
            {GRADIENT_PRESETS.map((preset) => {
              const selected = matched?.id === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    onPresetClick(preset.id);
                    setOpen(false);
                  }}
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
        </div>
      )}
    </div>
  );
}
