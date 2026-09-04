"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/toaster";
import { saveAiSettingsAction, testAiConnectionAction } from "@/lib/actions/ai-settings";
import { AI_PROVIDERS, getProvider } from "@/lib/ai/models";
import type { RtAiSettings } from "@/types/database";
import { Bot, KeyRound, Loader2, CheckCircle2, ExternalLink, Sparkles, Wifi, WifiOff } from "lucide-react";

export function AiProviderSettings({
  initial,
  envStatus,
}: {
  initial: RtAiSettings;
  envStatus: Record<string, boolean>;
}) {
  const { toast } = useToast();
  const [provider, setProvider] = React.useState<string>(initial.provider);
  const [model, setModel] = React.useState<string>(initial.model);
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState<{ ok: boolean; ms?: number; error?: string } | null>(null);

  const providerOpt = getProvider(provider as import("@/types/database").AiProviderId) ?? AI_PROVIDERS[0];
  const models = providerOpt.models;

  // when provider changes, reset model to recommended
  React.useEffect(() => {
    const p = getProvider(provider as import("@/types/database").AiProviderId);
    if (p && !p.models.some((m) => m.id === model)) {
      const rec = p.models.find((m) => m.recommended)?.id ?? p.models[0]?.id;
      if (rec) setModel(rec);
    }
  }, [provider, model]);

  const envOk = providerOpt.envKey ? (envStatus[providerOpt.envKey] ?? false) : true;
  const isMock = provider === "mock";

  async function handleTest(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    setTesting(true);
    setTestResult(null);
    const fd = new FormData();
    fd.set("provider", provider);
    fd.set("model", model);
    try {
      const res = await testAiConnectionAction(fd);
      setTestResult(res);
      if (res.ok) {
        toast({ title: "Koneksi berhasil", description: `Latency ${res.ms}ms` });
      } else {
        toast({ title: "Koneksi gagal", description: res.error ?? "Unknown error", variant: "error" });
      }
    } catch {
      setTestResult({ ok: false, error: "Unexpected error" });
      toast({ title: "Koneksi gagal", description: "Unexpected error", variant: "error" });
    } finally {
      setTesting(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData();
    fd.set("provider", provider);
    fd.set("model", model);
    fd.set("is_enabled", "true");
    const res = await saveAiSettingsAction(fd);
    setSaving(false);
    if (res.ok) {
      toast({ title: "Pengaturan AI disimpan", description: `${providerOpt.label} • ${model}` });
    } else {
      toast({ title: "Gagal simpan", description: res.error, variant: "error" });
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Bot className="size-4" /> AI Provider & Model
        </CardTitle>
        <CardDescription className="text-xs">Pilih provider dan model untuk Smart Input & Telegram parser. API key tetap di env.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label>Provider</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih provider" />
              </SelectTrigger>
              <SelectContent>
                {AI_PROVIDERS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label} — {p.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{providerOpt.description}</p>
            {providerOpt.docsUrl && (
              <a href={providerOpt.docsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                Dokumentasi API key <ExternalLink className="size-3" />
              </a>
            )}
          </div>

          <div className="space-y-2">
            <Label>Model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih model" />
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.label} {m.recommended ? "★" : ""} — {m.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Model akan dipakai untuk parsing: &ldquo;Beli konsumsi 75 ribu dari kas&rdquo; → expense</p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border bg-muted/20 px-3 py-2">
            <KeyRound className="size-4 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium">API Key: {providerOpt.envKey || "—"}</p>
              <p className="text-xs text-muted-foreground">{isMock ? "Mock tidak butuh key" : envOk ? "Terdeteksi di env ✓" : "Belum terdeteksi di env — set di .env / Vercel"}</p>
            </div>
            <Badge variant={envOk || isMock ? "success" : "destructive"} className="shrink-0 rounded-full">
              {envOk || isMock ? "OK" : "Missing"}
            </Badge>
          </div>

          {!envOk && !isMock && (
            <p className="rounded-xl bg-warning/10 px-3 py-2 text-xs text-warning">
              Set <code className="rounded bg-background px-1">{providerOpt.envKey}=sk-...</code> di <code>.env</code> atau Vercel → Settings → Environment Variables, lalu redeploy.
            </p>
          )}

          <button type="button" onClick={handleTest} disabled={testing || !envOk} className="flex w-full items-center justify-center gap-2 rounded-xl border bg-muted/20 px-3 py-2 text-sm font-medium hover:bg-muted/30 disabled:opacity-50">
            {testing ? <Loader2 className="size-4 animate-spin" /> : testResult?.ok ? <Wifi className="size-4 text-green-500" /> : testResult && !testResult.ok ? <WifiOff className="size-4 text-destructive" /> : <Wifi className="size-4" />}
            {testing ? "Menguji..." : testResult?.ok ? `Koneksi berhasil (${testResult.ms}ms)` : testResult && !testResult.ok ? "Koneksi gagal — coba lagi" : "Uji Koneksi"}
          </button>

          {testResult && !testResult.ok && testResult.error && (
            <p className="rounded-xl bg-destructive/5 px-3 py-2 text-xs text-destructive break-all">{testResult.error}</p>
          )}

          <Separator />

          <div className="flex items-center gap-2 rounded-xl bg-card px-3 py-2 text-xs">
            <Sparkles className="size-4 text-muted-foreground" />
            <span>
              Saat ini: <b>{initial.provider}</b> • <b>{initial.model}</b> {initial.is_enabled ? "• Aktif" : "• Nonaktif"}
            </span>
            {initial.provider === provider && initial.model === model ? (
              <Badge variant="outline" className="ml-auto rounded-full">
                <CheckCircle2 className="mr-1 size-3" /> Tersimpan
              </Badge>
            ) : (
              <Badge variant="secondary" className="ml-auto rounded-full">
                Belum disimpan
              </Badge>
            )}
          </div>

          <Button type="submit" disabled={saving} className="w-full rounded-xl">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Bot className="size-4" />}
            Simpan Pengaturan AI
          </Button>

          <p className="text-center text-[11px] text-muted-foreground">Provider abstraction — OpenRouter bisa diganti tanpa ubah parser. Mock untuk tes tanpa biaya.</p>
        </form>
      </CardContent>
    </Card>
  );
}
