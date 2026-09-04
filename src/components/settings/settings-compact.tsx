"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { PocketManager } from "@/components/pockets/pocket-manager";
import { AiProviderSettings } from "@/components/ai/ai-provider-settings";
import { LinkTelegramCard } from "@/components/telegram/link-telegram";
import type { Pocket, RtAiSettings } from "@/types/database";
import { Database, Plug, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "data" | "integrasi";

export function SettingsCompact({
  pockets,
  loadError,
  aiSettings,
  envStatus,
}: {
  pockets: Pocket[];
  loadError: string | null;
  aiSettings: RtAiSettings | null;
  envStatus: Record<string, boolean>;
}) {
  const [tab, setTab] = React.useState<Tab>("data");

  return (
    <div className="space-y-3">
      {/* Compact segmented tabs */}
      <div className="grid grid-cols-2 gap-1 rounded-2xl border bg-muted/30 p-1">
        <button
          type="button"
          onClick={() => setTab("data")}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors",
            tab === "data" ? "bg-card shadow-sm border text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Database className="size-3.5" /> Data
        </button>
        <button
          type="button"
          onClick={() => setTab("integrasi")}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors",
            tab === "integrasi" ? "bg-card shadow-sm border text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Plug className="size-3.5" /> Integrasi
        </button>
      </div>

      {/* Content */}
      {tab === "data" && (
        <div className="space-y-3 animate-in fade-in duration-200">
          <Card className="border-0 shadow-none">
            <CardContent className="p-0">
              <div className="flex items-center gap-2 px-1 py-2">
                <FileSpreadsheet className="size-3.5 text-muted-foreground" />
                <p className="text-xs font-semibold text-muted-foreground">DATA & KANTONG</p>
              </div>
              <div className="space-y-3">
                <Card>
                  <CardContent className="p-3">
                    <Link href="/import" className="flex items-center gap-3">
                      <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                        <FileSpreadsheet className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">Import Excel</p>
                        <p className="text-xs text-muted-foreground">Migrasi historis → ledger</p>
                      </div>
                      <span className="text-xs font-medium text-primary">Buka →</span>
                    </Link>
                  </CardContent>
                </Card>

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
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "integrasi" && (
        <div className="space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 px-1 pt-1">
            <Plug className="size-3.5 text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground">INTEGRASI</p>
            <span className="ml-auto text-[11px] text-muted-foreground">AI & Telegram</span>
          </div>

          {/* Grouped Integration Card */}
          <Card className="overflow-hidden p-0">
            <div className="divide-y">
              <div className="bg-muted/10">
                {aiSettings ? (
                  <div className="p-0">
                    <AiProviderSettings initial={aiSettings} envStatus={envStatus} />
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-muted-foreground">AI settings tidak tersedia — jalankan migrasi 005.</div>
                )}
              </div>
              <div className="bg-card">
                <LinkTelegramCard />
              </div>
            </div>
          </Card>

          <Card className="border-dashed bg-muted/20">
            <CardContent className="p-3 text-[11px] leading-relaxed text-muted-foreground">
              Integrasi terpisah dari data — AI untuk Smart Input & Telegram parser, Telegram untuk catat transaksi tanpa buka web.
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
