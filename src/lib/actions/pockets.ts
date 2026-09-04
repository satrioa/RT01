"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { getCurrentRtId } from "@/lib/auth";
import { pocketSchema } from "@/lib/validations/pocket";

export type PocketActionResult = { ok: boolean; error?: string; id?: string };

function parsePocketForm(formData: FormData) {
  const raw: Record<string, unknown> = {
    name: formData.get("name"),
    description: (formData.get("description") as string) || null,
    icon: (formData.get("icon") as string) || null,
    color: (formData.get("color") as string) || null,
    is_active: formData.get("is_active") === "false" ? false : true,
    sort_order: Number(formData.get("sort_order") ?? 0),
  };
  // coerce empty strings to null for optional fields
  if (raw.description === "") raw.description = null;
  if (raw.icon === "") raw.icon = null;
  if (raw.color === "") raw.color = null;
  return raw;
}

export async function createPocketAction(formData: FormData): Promise<PocketActionResult> {
  const raw = parsePocketForm(formData);
  const parsed = pocketSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return { ok: false, error: msg };
  }

  const rtId = await getCurrentRtId();
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("pockets")
    .insert({ rt_id: rtId, ...parsed.data })
    .select("id")
    .single();

  if (error) {
    // handle unique violation nicely
    if (String(error.message).includes("duplicate") || String(error.code) === "23505") {
      return { ok: false, error: "Nama kantong sudah ada di RT ini." };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/pengaturan");
  revalidatePath("/transactions/new");
  revalidatePath("/transaksi/new");
  return { ok: true, id: data?.id as string | undefined };
}

export async function updatePocketAction(id: string, formData: FormData): Promise<PocketActionResult> {
  const raw = parsePocketForm(formData);
  // allow partial but require name
  const parsed = pocketSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return { ok: false, error: msg };
  }

  const rtId = await getCurrentRtId();
  const supabase = createServerClient();

  // ownership check
  const { data: existing } = await supabase.from("pockets").select("rt_id").eq("id", id).maybeSingle();
  if (!existing) return { ok: false, error: "Kantong tidak ditemukan" };
  if ((existing as { rt_id: string }).rt_id !== rtId) return { ok: false, error: "Bukan kantong RT Anda" };

  const { error } = await supabase.from("pockets").update(parsed.data).eq("id", id);

  if (error) {
    if (String(error.message).includes("duplicate") || String(error.code) === "23505") {
      return { ok: false, error: "Nama kantong sudah ada." };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/pengaturan");
  revalidatePath(`/pockets/${id}`);
  revalidatePath("/transactions/new");
  return { ok: true, id };
}

export async function archivePocketAction(id: string): Promise<PocketActionResult> {
  const rtId = await getCurrentRtId();
  const supabase = createServerClient();

  const { data: existing } = await supabase.from("pockets").select("rt_id, is_active").eq("id", id).maybeSingle();
  if (!existing) return { ok: false, error: "Kantong tidak ditemukan" };
  if ((existing as { rt_id: string }).rt_id !== rtId) return { ok: false, error: "Bukan kantong RT Anda" };

  // Prevent archiving if pocket still has transactions/transfers? Allow soft-archive via is_active.
  // We check if there are any transactions to prevent orphan? For now allow but warn via confirm UI.
  const { error } = await supabase.from("pockets").update({ is_active: false }).eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/pengaturan");
  revalidatePath("/transactions/new");
  return { ok: true, id };
}

export async function deletePocketAction(id: string): Promise<PocketActionResult> {
  // Hard delete — only if no transactions/transfers reference it
  const rtId = await getCurrentRtId();
  const supabase = createServerClient();

  const { data: existing } = await supabase.from("pockets").select("rt_id").eq("id", id).maybeSingle();
  if (!existing) return { ok: false, error: "Kantong tidak ditemukan" };
  if ((existing as { rt_id: string }).rt_id !== rtId) return { ok: false, error: "Bukan kantong RT Anda" };

  const [txCount, trCount] = await Promise.all([
    supabase.from("transactions").select("id", { count: "exact", head: true }).eq("pocket_id", id),
    supabase.from("transfers").select("id", { count: "exact", head: true }).or(`from_pocket_id.eq.${id},to_pocket_id.eq.${id}`),
  ]);

  const hasRefs = (txCount.count ?? 0) > 0 || (trCount.count ?? 0) > 0;
  if (hasRefs) {
    // fallback to archive
    return archivePocketAction(id);
  }

  const { error } = await supabase.from("pockets").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/pengaturan");
  revalidatePath("/transactions/new");
  return { ok: true, id };
}
