"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AmountInput } from "@/components/transactions/amount-input";
import { useToast } from "@/components/ui/toaster";
import { formatRupiah } from "@/lib/format";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { createPocketAction, updatePocketAction, deletePocketAction, archivePocketAction } from "@/lib/actions/pockets";
import type { Pocket } from "@/types/database";
import { Pencil, Trash2, Plus, Wallet, Archive, Loader2, Palette } from "lucide-react";
import { ANIMATED_GRADIENT_PRESETS, applyPresetToPocket, GRADIENT_PRESET_MAP } from "@/lib/gradients";
import { deriveGradient } from "@/lib/color";
import { GradientPickerPopover } from "./gradient-picker";

function PocketForm({
  initial,
  onClose,
  onSuccess,
}: {
  initial?: Pocket | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = React.useState(false);
  const [color, setColor] = React.useState(initial?.color ?? "#111827");
  const [gradientC1, setGradientC1] = React.useState<string | null>(initial?.gradient_c1 ?? null);
  const [gradientC3, setGradientC3] = React.useState<string | null>(initial?.gradient_c3 ?? null);
  const [customGradient, setCustomGradient] = React.useState<boolean>(!!initial?.gradient_c1 || !!initial?.gradient_c3);
  const [isActive, setIsActive] = React.useState<string>(initial ? String(initial.is_active) : "true");
  const isEdit = !!initial;

  // keep in sync when switching between pockets without remount edge
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
    setColor(initial?.color ?? "#111827");
  }, [initial?.color, initial?.id]);
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
    setGradientC1(initial?.gradient_c1 ?? null);
  }, [initial?.gradient_c1, initial?.id]);
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
    setGradientC3(initial?.gradient_c3 ?? null);
  }, [initial?.gradient_c3, initial?.id]);
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
    setCustomGradient(!!initial?.gradient_c1 || !!initial?.gradient_c3);
  }, [initial?.gradient_c1, initial?.gradient_c3, initial?.id]);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
    setIsActive(initial ? String(initial.is_active) : "true");
  }, [initial?.is_active, initial?.id]);

  const preview = React.useMemo(() => {
    if (customGradient && gradientC1 && gradientC3) return { c1: gradientC1, c2: color, c3: gradientC3 };
    return deriveGradient(color);
  }, [color, gradientC1, gradientC3, customGradient]);

  function handlePresetClick(presetId: string) {
    const animatedPreset = ANIMATED_GRADIENT_PRESETS[presetId as keyof typeof ANIMATED_GRADIENT_PRESETS];
    if (animatedPreset) {
      setColor(animatedPreset.c2.toLowerCase());
      setGradientC1(animatedPreset.c1.toLowerCase());
      setGradientC3(animatedPreset.c3.toLowerCase());
      setCustomGradient(true);
      return;
    }
    const preset = GRADIENT_PRESET_MAP.get(presetId);
    if (!preset) return;
    const applied = applyPresetToPocket(preset);
    setColor(applied.color);
    setGradientC1(applied.gradient_c1);
    setGradientC3(applied.gradient_c3);
    setCustomGradient(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    fd.set("color", color);
    if (customGradient) {
      fd.set("gradient_c1", gradientC1 ?? "");
      fd.set("gradient_c3", gradientC3 ?? "");
    } else {
      fd.set("gradient_c1", "");
      fd.set("gradient_c3", "");
    }
    if (!fd.get("is_active")) fd.set("is_active", "true");
    const res = isEdit && initial
      ? await updatePocketAction(initial.id, fd)
      : await createPocketAction(fd);
    setSubmitting(false);
    if (res.ok) {
      toast({ title: isEdit ? "Kantong diperbarui" : "Kantong dibuat", description: isEdit ? "Perubahan tersimpan." : "Kantong baru berhasil ditambahkan." });
      onSuccess();
    } else {
      toast({ title: "Gagal", description: res.error ?? "Terjadi kesalahan", variant: "error" });
    }
  }

  return (
    <form key={initial?.id ?? "new"} onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="pocket-name">Nama *</Label>
        <Input name="name" id="pocket-name" required maxLength={50} defaultValue={initial?.name ?? ""} placeholder="Contoh: Kas, BOP, Sosial" />
      </div>

      <div className="rounded-2xl border border-[#d5efd6] bg-[#f0faf0] p-3 space-y-1.5">
        <Label htmlFor="pocket-saldo" className="flex items-center gap-1.5 text-foreground">
          <Wallet className="size-3.5 text-[#0d9488]" /> Saldo Awal
        </Label>
        <AmountInput name="opening_balance" defaultValue={initial?.opening_balance ?? "0"} placeholder="Rp 0" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pocket-desc">Deskripsi</Label>
        <Textarea name="description" id="pocket-desc" rows={1} maxLength={200} defaultValue={initial?.description ?? ""} placeholder="Deskripsi singkat (opsional)" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="pocket-order">Urutan</Label>
          <Input name="sort_order" id="pocket-order" type="number" min={0} defaultValue={String(initial?.sort_order ?? 0)} />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border bg-muted/20 p-3">
        <div className="flex items-center gap-1.5">
          <Palette className="size-3.5 text-muted-foreground" />
          <Label className="text-sm">Tampilan Kantong</Label>
        </div>
        <p className="text-[11px] text-muted-foreground">Atur tiga warna gradient secara bebas atau pilih tema preset.</p>
        <GradientPickerPopover
          color={color}
          gradientC1={gradientC1}
          gradientC3={gradientC3}
          customGradient={customGradient}
          preview={preview}
          onPresetClick={handlePresetClick}
        />
        <div className="grid grid-cols-3 gap-2">
          {([
            { label: "Color 1", value: preview.c1, onChange: setGradientC1 },
            { label: "Color 2", value: color, onChange: setColor },
            { label: "Color 3", value: preview.c3, onChange: setGradientC3 },
          ] as const).map((item) => (
            <label key={item.label} className="flex min-w-0 flex-col gap-1 text-[11px] text-muted-foreground">
              {item.label}
              <input
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(item.value) ? item.value : "#111827"}
                onChange={(e) => {
                  setCustomGradient(true);
                  item.onChange(e.target.value);
                }}
                className="h-10 w-full cursor-pointer rounded-lg border bg-background p-1"
                aria-label={item.label}
              />
              <span className="truncate font-mono text-[10px] uppercase">{item.value}</span>
            </label>
          ))}
        </div>
        <input type="hidden" name="color" value={color} />
        {customGradient ? (
          <>
            <input type="hidden" name="gradient_c1" value={gradientC1 ?? ""} />
            <input type="hidden" name="gradient_c3" value={gradientC3 ?? ""} />
          </>
        ) : (
          <>
            <input type="hidden" name="gradient_c1" value="" />
            <input type="hidden" name="gradient_c3" value="" />
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="pocket-icon">Icon</Label>
          <Input name="icon" id="pocket-icon" maxLength={50} defaultValue={initial?.icon ?? ""} placeholder="wallet / building / heart" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pocket-status">Status</Label>
          {/* Native select tanpa portal: dropdown portal di dalam Drawer modal tidak bisa diklik */}
          <select
            id="pocket-status"
            value={isActive}
            onChange={(e) => setIsActive(e.target.value)}
            className="h-10 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none focus-visible:ring-1 focus-visible:ring-primary"
          >
            <option value="true">Aktif</option>
            <option value="false">Arsip (nonaktif)</option>
          </select>
          <input type="hidden" name="is_active" value={isActive} />
        </div>
      </div>

      <div className="sticky bottom-0 z-10 -mx-1 flex gap-2 border-t bg-white/95 pt-3 pb-[max(0.25rem,env(safe-area-inset-bottom))] backdrop-blur dark:bg-neutral-900/95">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1">Batal</Button>
        <Button type="submit" disabled={submitting} className="flex-1">
          {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {isEdit ? "Simpan" : "Buat Kantong"}
        </Button>
      </div>
    </form>
  );
}

export function PocketManager({ pockets }: { pockets: Pocket[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [showAdd, setShowAdd] = React.useState(false);
  const [editing, setEditing] = React.useState<Pocket | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const isSheetOpen = showAdd || !!editing;
  const sheetMode: "add" | "edit" = editing ? "edit" : "add";

  function closeSheet() {
    setShowAdd(false);
    setEditing(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus kantong ini? Jika ada transaksi, akan diarsip (nonaktif) bukan dihapus permanen.")) return;
    setDeletingId(id);
    const res = await deletePocketAction(id);
    setDeletingId(null);
    if (res.ok) {
      toast({ title: "Kantong dihapus", description: "Berhasil dihapus / diarsip." });
      router.refresh();
    } else {
      toast({ title: "Gagal hapus", description: res.error, variant: "error" });
    }
  }

  async function handleArchiveToggle(p: Pocket) {
    setDeletingId(p.id);
    const res = await archivePocketAction(p.id);
    setDeletingId(null);
    if (res.ok) {
      toast({ title: p.is_active ? "Kantong diarsipkan" : "Kantong diaktifkan", description: p.name });
      router.refresh();
    } else {
      toast({ title: "Gagal", description: res.error, variant: "error" });
    }
  }

  const active = pockets.filter((p) => p.is_active);
  const archived = pockets.filter((p) => !p.is_active);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Wallet className="size-4" /> Kantong ({pockets.length})
          </CardTitle>
          <Button size="sm" onClick={() => { setEditing(null); setShowAdd(true); }} className="h-8 rounded-xl">
            <Plus className="size-4" /> Tambah
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {pockets.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Belum ada kantong. Buat kantong pertama untuk mulai transaksi.
            </div>
          ) : (
            <div className="space-y-2">
              {active.map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3">
                  <span className="size-3 shrink-0 rounded-full" style={{ background: p.color || "#111827" }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.description || `Urutan ${p.sort_order} • ${p.icon || "wallet"}`} • Saldo awal {formatRupiah(Number(p.opening_balance ?? 0))}
                    </p>
                  </div>
                  <span className="hidden text-[11px] font-medium text-success sm:inline">Aktif</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setEditing(p); setShowAdd(false); }}
                      className="flex size-8 items-center justify-center rounded-full border hover:bg-accent"
                      aria-label="Edit"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      onClick={() => handleArchiveToggle(p)}
                      disabled={deletingId === p.id}
                      className="flex size-8 items-center justify-center rounded-full border hover:bg-accent disabled:opacity-50"
                      aria-label="Arsip"
                      title="Arsipkan"
                    >
                      {deletingId === p.id ? <Loader2 className="size-3.5 animate-spin" /> : <Archive className="size-3.5" />}
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      disabled={deletingId === p.id}
                      className="flex size-8 items-center justify-center rounded-full border text-destructive hover:bg-destructive/10 disabled:opacity-50"
                      aria-label="Hapus"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {archived.length > 0 && (
                <>
                  <p className="pt-2 text-xs font-semibold text-muted-foreground">Arsip ({archived.length})</p>
                  {archived.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 rounded-2xl border bg-muted/30 px-4 py-3 opacity-80">
                      <span className="size-3 shrink-0 rounded-full" style={{ background: p.color || "#6b7280" }} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{p.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {p.description || "Diarsip"} • Saldo awal {formatRupiah(Number(p.opening_balance ?? 0))}
                        </p>
                      </div>
                      <span className="text-[11px] font-medium text-muted-foreground">Arsip</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setEditing(p); setShowAdd(false); }}
                          className="flex size-8 items-center justify-center rounded-full border bg-card hover:bg-accent"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          disabled={deletingId === p.id}
                          className="flex size-8 items-center justify-center rounded-full border bg-card text-destructive hover:bg-destructive/10 disabled:opacity-50"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          <p className="text-xs leading-relaxed text-muted-foreground">
            Tap pensil untuk edit - kantong dengan transaksi tidak bisa dihapus permanen, akan diarsip.
          </p>
        </CardContent>
      </Card>

      <Drawer open={isSheetOpen} onOpenChange={(o: boolean) => !o && closeSheet()} direction="bottom">
        <DrawerContent className="max-h-[92dvh] sm:max-h-[90vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>{sheetMode === "edit" ? `Edit: ${editing?.name ?? "Kantong"}` : "Tambah Kantong"}</DrawerTitle>
            <DrawerDescription>
              {sheetMode === "edit" ? "Ubah nama, deskripsi, warna atau urutan. Klik Simpan untuk menyimpan." : "Buat kantong baru untuk memisahkan dana. Nama harus unik."}
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4 [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none]">
            {sheetMode === "edit" && editing ? (
              <PocketForm
                key={editing.id}
                initial={editing}
                onClose={closeSheet}
                onSuccess={() => {
                  closeSheet();
                  router.refresh();
                }}
              />
            ) : (
              <PocketForm
                key="add"
                initial={null}
                onClose={closeSheet}
                onSuccess={() => {
                  closeSheet();
                  router.refresh();
                }}
              />
            )}
          </div>
          <DrawerFooter>
            <p className="text-center text-[11px] text-muted-foreground">Geser handle di atas atau tap backdrop untuk menutup.</p>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
