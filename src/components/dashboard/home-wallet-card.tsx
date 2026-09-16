"use client";

import { ArrowDownToLine, ArrowRight, ArrowUp, Eye, EyeOff, Receipt } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GlassButton } from "@/components/glass-button";
import { ActionSwapText } from "@/components/motion/action-swap";
import { AccountSwitcher } from "@/components/motion/wallet-card/account-switcher";
import { BalanceDelta } from "@/components/motion/wallet-card/balance-delta";
import type { WalletAccount } from "@/components/motion/wallet-card/types";
import { ShaderGradientBackground, type ShaderGradientPreset } from "@/components/motion/shader-gradient-background";
import { Button } from "@/components/ui/button";
import { SPRING_PRESS } from "@/lib/ease";
import { formatRupiah } from "@/lib/format";
import type { PocketBalance, RtAppearanceSettings, UserRole } from "@/types/database";
import { deriveGradient } from "@/lib/color";
import { GRADIENT_PRESET_MAP, DEFAULT_PRESET } from "@/lib/gradients";

function RtWalletActions({
  onPemasukan,
  onPengeluaran,
  onTransaksi,
}: {
  onPemasukan?: () => void;
  onPengeluaran?: () => void;
  onTransaksi?: () => void;
}) {
  const reduce = useReducedMotion();
  const actions = [
    { key: "pemasukan", label: "Pemasukan", icon: ArrowDownToLine, onClick: onPemasukan },
    { key: "pengeluaran", label: "Pengeluaran", icon: ArrowUp, onClick: onPengeluaran },
    { key: "transaksi", label: "Transaksi", icon: Receipt, onClick: onTransaksi },
  ] as const;
  return (
    <div className="flex items-start justify-center gap-4">
      {actions.map(({ key, label, icon: Icon, onClick }) => (
        <motion.div
          key={key}
          whileTap={reduce ? undefined : { scale: 0.94 }}
          transition={SPRING_PRESS}
          className="flex flex-1 flex-col items-center gap-2"
        >
          <GlassButton
            size="icon"
            onClick={onClick}
            aria-label={label}
            className="size-12 rounded-full text-white"
          >
            <Icon className="h-5 w-5" />
          </GlassButton>
          <span className="text-xs font-medium text-white/90">{label}</span>
        </motion.div>
      ))}
    </div>
  );
}

export function HomeWalletCard({
  pockets,
  totalBalance,
  appearance,
  role,
}: {
  pockets: PocketBalance[];
  totalBalance: number;
  appearance?: RtAppearanceSettings | null;
  role?: UserRole | null;
}) {
  const router = useRouter();
  const isViewer = !role || role === "viewer";
  // Build accounts: Semua + dynamic pockets
  const accounts: WalletAccount[] = [
    { id: "semua", name: "Semua", address: `${pockets.length} kantong - Total` },
    ...pockets.map((p) => ({
      id: p.id,
      name: p.name,
      address: p.description ?? `${p.name} - Saldo`,
    })),
  ];

  const [activeId, setActiveId] = useState<string>("semua");
  const [balanceHidden, setBalanceHidden] = useState(false);

  const activePocket = pockets.find((p) => p.id === activeId);
  const balance = activeId === "semua" ? totalBalance : Number(activePocket?.balance ?? 0);
  const balancePrefix = "Rp";

  const shownBalance = `${balancePrefix} ${balance.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  const maskedBalance = "•••••••";

  const handlePemasukan = () => {
    const qs = activeId === "semua" ? "type=income" : `type=income&pocket_id=${activeId}`;
    router.push(`/transactions/new?${qs}`);
  };
  const handlePengeluaran = () => {
    const qs = activeId === "semua" ? "type=expense" : `type=expense&pocket_id=${activeId}`;
    router.push(`/transactions/new?${qs}`);
  };
  const handleTransaksi = () => {
    if (activeId === "semua") router.push("/transactions");
    else router.push(`/pockets/${activeId}`);
  };

  const reduceMotion = useReducedMotion();
  const shaderPreset = (() => {
    if (activeId === "semua") {
      if (appearance?.gradient_preset && appearance.gradient_preset !== "custom") return appearance.gradient_preset as ShaderGradientPreset;
      return "custom" as ShaderGradientPreset;
    }
    const pocketPreset = activePocket?.gradient_preset;
    if (pocketPreset && pocketPreset !== "custom") return pocketPreset as ShaderGradientPreset;
    return "custom" as ShaderGradientPreset;
  })();
  const shaderColors = (() => {
    // Semua: appearance.gradient_color1-4 with fallback to style preset or default
    if (activeId === "semua") {
      if (appearance?.gradient_color1 && appearance.gradient_color2 && appearance.gradient_color3 && appearance.gradient_color4) {
        return { c1: appearance.gradient_color1, c2: appearance.gradient_color2, c3: appearance.gradient_color3, c4: appearance.gradient_color4 };
      }
      // partial custom colors -> fill gaps with legacy style preset or derived fallback
      if (appearance?.gradient_color1 || appearance?.gradient_color2 || appearance?.gradient_color3 || appearance?.gradient_color4) {
        const fallback = (() => {
          const styleId = appearance?.style ?? "sunset";
          if (styleId !== "auto") {
            const preset = GRADIENT_PRESET_MAP.get(styleId);
            if (preset) return { c1: preset.c1, c2: preset.c2, c3: preset.c3, c4: "#D2D7EC" };
            if (styleId === "biru_rt") return { c1: "#f9f9ff", c2: "#5697ff", c3: "#d2e3ff", c4: "#D2D7EC" };
          }
          return { c1: DEFAULT_PRESET.c1, c2: DEFAULT_PRESET.c2, c3: DEFAULT_PRESET.c3, c4: "#D2D7EC" };
        })();
        return {
          c1: appearance?.gradient_color1 ?? fallback.c1,
          c2: appearance?.gradient_color2 ?? fallback.c2,
          c3: appearance?.gradient_color3 ?? fallback.c3,
          c4: appearance?.gradient_color4 ?? fallback.c4,
        };
      }
      const styleId = appearance?.style ?? "sunset";
      if (styleId !== "auto") {
        const preset = GRADIENT_PRESET_MAP.get(styleId);
        if (preset) return { c1: preset.c1, c2: preset.c2, c3: preset.c3, c4: "#D2D7EC" };
        if (styleId === "biru_rt") return { c1: "#f9f9ff", c2: "#5697ff", c3: "#d2e3ff", c4: "#D2D7EC" };
      }
      return { c1: DEFAULT_PRESET.c1, c2: DEFAULT_PRESET.c2, c3: DEFAULT_PRESET.c3, c4: "#D2D7EC" };
    }
    // Per kantong: c2 = color, c1/c3/c4 = custom atau derive
    const base = activePocket?.color ?? "#111827";
    const c1 = activePocket?.gradient_c1 ?? null;
    const c3 = activePocket?.gradient_c3 ?? null;
    const c4 = activePocket?.gradient_c4 ?? null;
    if (c1 && c3 && c4) return { c1, c2: base, c3, c4 };
    if (c1 || c3 || c4) {
      const derived = deriveGradient(base);
      return { c1: c1 ?? derived.c1, c2: base, c3: c3 ?? derived.c3, c4: c4 ?? "#D2D7EC" };
    }
    const derived = deriveGradient(base);
    return { c1: derived.c1, c2: derived.c2, c3: derived.c3, c4: "#D2D7EC" };
  })();
  const shaderSpeed = appearance?.gradient_speed ?? 0.14;
  const shaderBlur = appearance?.gradient_blur ?? 0.7;
  const shaderIntensity = appearance?.gradient_intensity ?? 0.95;

  // For delta, use 0 as defaultChange
  return (
    <div className="relative w-full overflow-hidden rounded-4xl border border-border p-6">
      {/* Shader gradient background */}
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

      {/* Content above shader */}
      <div className="relative z-10">
        {/* Header: wallet switcher */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1 text-white [&_.text-foreground]:!text-white [&_.text-muted-foreground]:!text-white/60">
            <AccountSwitcher accounts={accounts} activeAccount={accounts.find((a) => a.id === activeId)} onSelect={setActiveId} />
          </div>
          <span className="shrink-0 text-xs text-white/70">{activeId === "semua" ? "Semua" : activePocket?.name}</span>
        </div>

        <div className="mt-8 flex flex-col items-center text-center">
          <div className="flex items-center gap-1.5">
            <p className="text-xs text-white/80">Saldo</p>
            <button
              type="button"
              onClick={() => setBalanceHidden((h) => !h)}
              aria-label={balanceHidden ? "Show balance" : "Hide balance"}
              className="text-white/70 outline-none transition-colors hover:text-white"
            >
              {balanceHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
          <ActionSwapText
            value={balanceHidden ? "hidden" : shownBalance}
            animation="cascade"
            className="text-3xl font-semibold text-white"
          >
            {balanceHidden ? maskedBalance : shownBalance}
          </ActionSwapText>
          {balanceHidden ? (
            <div className="mt-2 flex h-7 items-center justify-center">
              <span className="translate-y-[3px] text-sm font-semibold text-white/70 leading-none tracking-[0.3em]">*****</span>
            </div>
          ) : (
            <BalanceDelta balance={balance} initialChange={0} />
          )}
          <p className="mt-1 text-[11px] text-white/70">
            {activeId === "semua" ? `${pockets.length} kantong aktif` : `${formatRupiah(balance)} - ${activePocket?.name ?? ""}`}
          </p>
        </div>

        <div className="mt-8">
          {isViewer ? (
            <Button
              onClick={() => router.push("/transactions")}
              variant="secondary"
              className="w-full rounded-full bg-white/80 text-foreground backdrop-blur hover:bg-white dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
            >
              Lihat semua transaksi
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <RtWalletActions onPemasukan={handlePemasukan} onPengeluaran={handlePengeluaran} onTransaksi={handleTransaksi} />
          )}
        </div>
      </div>
    </div>
  );
}
