"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toaster";
import { createPocketAction, updatePocketAction, deletePocketAction, archivePocketAction } from "@/lib/actions/pockets";
import type { Pocket } from "@/types/database";
import { Pencil, Trash2, Plus, Wallet, Archive, Loader2, X } from "lucide-react";

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
  const isEdit = !!initial;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
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
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{isEdit ? "Edit Kantong" : "Tambah Kantong"}</h3>
        <button type="button" onClick={onClose} className="flex size-8 items-center justify-center rounded-full border hover:bg-accent">
          <X className="size-4" />
        </button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Nama *</Label>
        <Input name="name" id="name" required maxLength={50} defaultValue={initial?.name ?? ""} placeholder="Contoh: Kas, BOP, Sosial" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Deskripsi</Label>
        <Textarea name="description" id="description" rows={2} maxLength={200} defaultValue={initial?.description ?? ""} placeholder="Deskripsi singkat (opsional)" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="color">Warna (hex)</Label>
          <Input name="color" id="color" maxLength={20} defaultValue={initial?.color ?? ""} placeholder="#111827" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sort_order">Urutan</Label>
          <Input name="sort_order" id="sort_order" type="number" min={0} defaultValue={String(initial?.sort_order ?? 0)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="icon">Icon</Label>
          <Input name="icon" id="icon" maxLength={50} defaultValue={initial?.icon ?? ""} placeholder="wallet / building" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="is_active">Status</Label>
          <select name="is_active" id="is_active" defaultValue={initial ? String(initial.is_active) : "true"} className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm">
            <option value="true">Aktif</option>
            <option value="false">Arsip (nonaktif)</option>
          </select>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
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

  async function handleDelete(id: string) {
    if (!confirm("Hapus kantong ini? Jika ada transaksi, akan diarsip (nonaktif) bukan dihapus permanen.")) return;
    setDeletingId(id);
    // try hard delete, fallback to archive inside action
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
          <Button size="sm" onClick={() => { setEditing(null); setShowAdd((v) => !v); }} className="h-8 rounded-xl">
            <Plus className="size-4" /> {showAdd ? "Tutup" : "Tambah"}
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
                      onClick={() => { setShowAdd(false); setEditing(p); }}
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
                          onClick={() => { setShowAdd(false); setEditing(p); }}
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
            Kantong dengan transaksi tidak bisa dihapus permanen — akan diarsip (is_active=false) agar ledger tetap valid.
          </p>
        </CardContent>
      </Card>

      {showAdd && (
        <PocketForm
          initial={null}
          onClose={() => setShowAdd(false)}
          onSuccess={() => { setShowAdd(false); router.refresh(); }}
        />
      )}

      {editing && (
        <PocketForm
          initial={editing}
          onClose={() => setEditing(null)}
          onSuccess={() => { setEditing(null); router.refresh(); }}
        />
      )}
    </div>
  );
}
