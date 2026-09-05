"use client";

import { ArrowDownToLine, ArrowUp, Eye, EyeOff, Receipt } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionSwapText } from "@/components/motion/action-swap";
import { AccountSwitcher } from "@/components/motion/wallet-card/account-switcher";
import { BalanceDelta } from "@/components/motion/wallet-card/balance-delta";
import type { WalletAccount } from "@/components/motion/wallet-card/types";
import Grainient from "@/components/motion/grainient";
import { SPRING_PRESS } from "@/lib/ease";
import { formatRupiah } from "@/lib/format";
import type { PocketBalance, RtAppearanceSettings } from "@/types/database";
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
    <div className="flex items-center justify-center gap-4">
      {actions.map(({ key, label, icon: Icon, onClick }) => (
        <motion.button
          key={key}
          type="button"
          onClick={onClick}
          whileTap={reduce ? undefined : { scale: 0.94 }}
          transition={SPRING_PRESS}
          className="flex flex-1 flex-col items-center gap-2 outline-none"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-foreground">
            <Icon className="h-5 w-5" />
          </span>
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
        </motion.button>
      ))}
    </div>
  );
}

export function HomeWalletCard({
  pockets,
  totalBalance,
  appearance,
}: {
  pockets: PocketBalance[];
  totalBalance: number;
  appearance?: RtAppearanceSettings | null;
}) {
  const router = useRouter();
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
  const grainColors = (() => {
    // Semua: pakai appearance.style (preset global), default sunset
    if (activeId === "semua") {
      const styleId = appearance?.style ?? "sunset";
      if (styleId !== "auto") {
        const preset = GRADIENT_PRESET_MAP.get(styleId);
        if (preset) return { c1: preset.c1, c2: preset.c2, c3: preset.c3 };
        if (styleId === "biru_rt") return { c1: "#f9f9ff", c2: "#5697ff", c3: "#d2e3ff" };
      }
      return { c1: DEFAULT_PRESET.c1, c2: DEFAULT_PRESET.c2, c3: DEFAULT_PRESET.c3 };
    }
    // Per kantong: c2 = color, c1/c3 = custom atau derive
    const base = activePocket?.color ?? "#111827";
    const c1 = (activePocket as unknown as { gradient_c1?: string | null })?.gradient_c1 ?? null;
    const c3 = (activePocket as unknown as { gradient_c3?: string | null })?.gradient_c3 ?? null;
    if (c1 && c3) return { c1, c2: base, c3 };
    return deriveGradient(base);
  })();
  const grainTimeSpeed = appearance?.animation_enabled === false || reduceMotion ? 0 : 0.18;
  const grainSaturation = appearance?.saturation ?? 1.1;
  const grainContrast = appearance?.contrast ?? 1.6;

  // For delta, use 0 as defaultChange
  return (
    <div className="relative w-full overflow-hidden rounded-4xl border border-border p-6">
      {/* Grainient animated background */}
      <div className="absolute inset-0">
        <Grainient
          color1={grainColors.c1}
          color2={grainColors.c2}
          color3={grainColors.c3}
          timeSpeed={grainTimeSpeed}
          warpStrength={0.7}
          warpFrequency={4.5}
          warpSpeed={1.6}
          grainAmount={0.04}
          grainAnimated={false}
          contrast={grainContrast}
          saturation={grainSaturation}
          zoom={0.85}
          lightMode
          className="opacity-70"
        />
        {/* Soft overlay for readability */}
        <div className="absolute inset-0 bg-white/55 backdrop-blur-[0.5px] dark:bg-zinc-900/40" />
      </div>

      {/* Content above grainient */}
      <div className="relative z-10">
        {/* Header: wallet switcher */}
        <div className="flex items-center justify-between gap-2">
          <AccountSwitcher accounts={accounts} activeAccount={accounts.find((a) => a.id === activeId)} onSelect={setActiveId} />
          <span className="shrink-0 text-xs text-muted-foreground">{activeId === "semua" ? "Semua" : activePocket?.name}</span>
        </div>

        <div className="mt-8 flex flex-col items-center text-center">
          <div className="flex items-center gap-1.5">
            <p className="text-xs text-muted-foreground">Saldo</p>
            <button
              type="button"
              onClick={() => setBalanceHidden((h) => !h)}
              aria-label={balanceHidden ? "Show balance" : "Hide balance"}
              className="text-muted-foreground outline-none transition-colors hover:text-foreground"
            >
              {balanceHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
          <ActionSwapText
            value={balanceHidden ? "hidden" : shownBalance}
            animation="cascade"
            className="text-3xl font-semibold text-foreground"
          >
            {balanceHidden ? maskedBalance : shownBalance}
          </ActionSwapText>
          {balanceHidden ? (
            <div className="mt-2 flex h-7 items-center justify-center">
              <span className="translate-y-[3px] text-sm font-semibold text-muted-foreground leading-none tracking-[0.3em]">*****</span>
            </div>
          ) : (
            <BalanceDelta balance={balance} initialChange={0} />
          )}
          <p className="mt-1 text-[11px] text-muted-foreground">
            {activeId === "semua" ? `${pockets.length} kantong aktif` : `${formatRupiah(balance)} - ${activePocket?.name ?? ""}`}
          </p>
        </div>

        <div className="mt-8">
          <RtWalletActions onPemasukan={handlePemasukan} onPengeluaran={handlePengeluaran} onTransaksi={handleTransaksi} />
        </div>
      </div>
    </div>
  );
}
