"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toaster";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { ColorPickerPopover } from "@/components/ui/color-picker";
import { createPocketAction, updatePocketAction, deletePocketAction, archivePocketAction } from "@/lib/actions/pockets";
import type { Pocket } from "@/types/database";
import { Pencil, Trash2, Plus, Wallet, Archive, Loader2 } from "lucide-react";

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
  const [isActive, setIsActive] = React.useState<string>(initial ? String(initial.is_active) : "true");
  const isEdit = !!initial;

  // keep color in sync when switching between pockets without remount edge
  React.useEffect(() => {
    setColor(initial?.color ?? "#111827");
  }, [initial?.color, initial?.id]);

  React.useEffect(() => {
    setIsActive(initial ? String(initial.is_active) : "true");
  }, [initial?.is_active, initial?.id]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    // override color from controlled picker (hidden input already holds it, but ensure)
    fd.set("color", color);
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
    <form key={initial?.id ?? "new"} onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="pocket-name">Nama *</Label>
        <Input name="name" id="pocket-name" required maxLength={50} defaultValue={initial?.name ?? ""} placeholder="Contoh: Kas, BOP, Sosial" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="pocket-desc">Deskripsi</Label>
        <Textarea name="description" id="pocket-desc" rows={2} maxLength={200} defaultValue={initial?.description ?? ""} placeholder="Deskripsi singkat (opsional)" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Warna</Label>
          <ColorPickerPopover
            value={color}
            onValueChange={setColor}
            swatches={["#111827", "#374151", "#0d9488", "#0ea5e9", "#e11d48", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899", "#6366f1"]}
            triggerShowValue
            triggerLabel="Pilih warna"
          />
          <input type="hidden" name="color" value={color} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pocket-order">Urutan</Label>
          <Input name="sort_order" id="pocket-order" type="number" min={0} defaultValue={String(initial?.sort_order ?? 0)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="pocket-icon">Icon</Label>
          <Input name="icon" id="pocket-icon" maxLength={50} defaultValue={initial?.icon ?? ""} placeholder="wallet / building / heart" />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={isActive} onValueChange={setIsActive}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Aktif</SelectItem>
              <SelectItem value="false">Arsip (nonaktif)</SelectItem>
            </SelectContent>
          </Select>
          <input type="hidden" name="is_active" value={isActive} />
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1">Batal</Button>
        <Button type="submit" disabled={submitting} className="flex-1">
          {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {isEdit ? "Simpan" : "Buat Kantong"}
        </Button>
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Nama harus unik per RT. Urutan menentukan posisi di dashboard & form transaksi.
      </p>
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
                    <p className="truncate text-xs text-muted-foreground">{p.description || `Urutan ${p.sort_order} • ${p.icon || "wallet"}`}</p>
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
                        <p className="truncate text-xs text-muted-foreground">{p.description || "Diarsip"}</p>
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
            Tap pensil untuk edit — kantong dengan transaksi tidak bisa dihapus permanen, akan diarsip.
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
          <div className="flex-1 overflow-y-auto px-4 pb-4">
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
