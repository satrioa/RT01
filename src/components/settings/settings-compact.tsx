"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PocketManager } from "@/components/pockets/pocket-manager";
import { AiProviderSettings } from "@/components/ai/ai-provider-settings";
import { LinkTelegramCard } from "@/components/telegram/link-telegram";
import { AppearanceSettings } from "@/components/settings/appearance-settings";
import type { Pocket, RtAiSettings, RtAppearanceSettings } from "@/types/database";
import { Database, Plug, FileSpreadsheet, Wallet, Bot, Send, ChevronRight, ArrowLeft, Palette } from "lucide-react";

type Section = "kantong" | "ai" | "telegram" | "tampilan" | null;

export function SettingsCompact({
  pockets,
  loadError,
  aiSettings,
  envStatus,
  appearance,
}: {
  pockets: Pocket[];
  loadError: string | null;
  aiSettings: RtAiSettings | null;
  envStatus: Record<string, boolean>;
  appearance: RtAppearanceSettings | null;
}) {
  const [section, setSection] = React.useState<Section>(null);

  if (section) {
    return (
      <div className="space-y-3">
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 rounded-full px-3 -ml-1" onClick={() => setSection(null)}>
          <ArrowLeft className="size-4" /> Kembali ke menu
        </Button>

        {section === "kantong" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Wallet className="size-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold tracking-wide text-muted-foreground">KANTONG</p>
              <span className="ml-auto text-[11px] text-muted-foreground">{pockets.length} kantong</span>
            </div>
            {loadError ? (
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="p-3 text-xs leading-relaxed text-muted-foreground">
                  <p className="font-semibold text-destructive">Gagal memuat kantong:</p>
                  <p className="mt-1 font-mono text-[11px] break-all">{loadError}</p>
                </CardContent>
              </Card>
            ) : null}
            <PocketManager pockets={pockets} />
          </div>
        )}

        {section === "ai" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Bot className="size-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold tracking-wide text-muted-foreground">AI PROVIDER</p>
            </div>
            {aiSettings ? (
              <AiProviderSettings initial={aiSettings} envStatus={envStatus} />
            ) : (
              <Card><CardContent className="p-4 text-center text-xs text-muted-foreground">AI settings tidak tersedia — jalankan migrasi 005.</CardContent></Card>
            )}
          </div>
        )}

        {section === "telegram" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Send className="size-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold tracking-wide text-muted-foreground">TELEGRAM</p>
            </div>
            <LinkTelegramCard />
            <Card className="border-dashed bg-muted/20">
              <CardContent className="p-3 text-[11px] leading-relaxed text-muted-foreground">
                Hubungkan Telegram untuk catat transaksi tanpa buka web — bot pakai parser & deterministik yang sama seperti Smart Input.
              </CardContent>
            </Card>
          </div>
        )}

        {section === "tampilan" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Palette className="size-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold tracking-wide text-muted-foreground">TAMPILAN</p>
            </div>
            <AppearanceSettings initial={appearance} />
          </div>
        )}

      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* DATA */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Database className="size-3.5 text-muted-foreground" />
          <p className="text-xs font-semibold tracking-wide text-muted-foreground">DATA</p>
        </div>

        <div className="grid gap-2">
          <Card className="overflow-hidden transition hover:bg-accent/50">
            <Link href="/import" className="flex w-full items-center gap-3 p-3 text-left">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <FileSpreadsheet className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Import Excel</p>
                <p className="text-xs text-muted-foreground">Migrasi historis → ledger</p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          </Card>

          <Card className="overflow-hidden transition hover:bg-accent/50">
            <button type="button" onClick={() => setSection("kantong")} className="flex w-full items-center gap-3 p-3 text-left">
              <span className="flex size-9 items-center justify-center rounded-xl bg-muted text-foreground border">
                <Wallet className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Kantong</p>
                <p className="text-xs text-muted-foreground">{pockets.length} kantong • kelola saldo awal & warna</p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </button>
          </Card>
          {loadError ? (
            <p className="px-1 text-[11px] text-destructive">Gagal memuat kantong — buka menu Kantong untuk detail.</p>
          ) : null}
        </div>
      </div>

      {/* TAMPILAN */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center gap-2 px-1">
          <Palette className="size-3.5 text-muted-foreground" />
          <p className="text-xs font-semibold tracking-wide text-muted-foreground">TAMPILAN</p>
          <span className="ml-auto text-[11px] text-muted-foreground">Kartu</span>
        </div>
        <div className="grid gap-2">
          <Card className="overflow-hidden transition hover:bg-accent/50">
            <button type="button" onClick={() => setSection("tampilan")} className="flex w-full items-center gap-3 p-3 text-left">
              <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#FDE68A] via-[#FB7185] to-[#7C3AED] text-white border">
                <Palette className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Tampilan</p>
                <p className="text-xs text-muted-foreground">Atur gradient & animasi kartu — hero & detail</p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </button>
          </Card>
        </div>
      </div>

      {/* INTEGRASI */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center gap-2 px-1">
          <Plug className="size-3.5 text-muted-foreground" />
          <p className="text-xs font-semibold tracking-wide text-muted-foreground">INTEGRASI</p>
          <span className="ml-auto text-[11px] text-muted-foreground">AI & Telegram</span>
        </div>

        <div className="grid gap-2">
          <Card className="overflow-hidden transition hover:bg-accent/50">
            <button type="button" onClick={() => setSection("ai")} className="flex w-full items-center gap-3 p-3 text-left">
              <span className="flex size-9 items-center justify-center rounded-xl bg-muted text-foreground border">
                <Bot className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">AI Provider</p>
                <p className="text-xs text-muted-foreground">{aiSettings ? `${aiSettings.provider} • ${aiSettings.model}` : "Belum dikonfigurasi"}</p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </button>
          </Card>

          <Card className="overflow-hidden transition hover:bg-accent/50">
            <button type="button" onClick={() => setSection("telegram")} className="flex w-full items-center gap-3 p-3 text-left">
              <span className="flex size-9 items-center justify-center rounded-xl bg-[#229ED9] text-white">
                <Send className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Telegram Bot</p>
                <p className="text-xs text-muted-foreground">Hubungkan akun untuk catat via chat</p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </button>
          </Card>
        </div>

        <Card className="border-dashed bg-muted/20">
          <CardContent className="p-3 text-[11px] leading-relaxed text-muted-foreground">
            Pilih menu di atas untuk mengatur. Data & Integrasi terpisah — AI untuk Smart Input & parser Telegram.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
