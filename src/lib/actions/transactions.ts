"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { getCurrentRtId } from "@/lib/auth";
import { transactionSchema } from "@/lib/validations/transaction";
import { transferSchema } from "@/lib/validations/transfer";

export type ActionResult = { ok: boolean; error?: string; id?: string };

export async function createTransactionAction(
  formData: FormData
): Promise<ActionResult> {
  const raw = {
    type: formData.get("type"),
    pocket_id: formData.get("pocket_id"),
    category_id: formData.get("category_id") || null,
    amount: formData.get("amount"),
    description: formData.get("description") || null,
    transaction_date: formData.get("transaction_date") || undefined,
    source: "web" as const,
  };

  const parsed = transactionSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return { ok: false, error: msg };
  }

  const rtId = await getCurrentRtId();
  const supabase = createServerClient();

  // Ownership + category compatibility are enforced by DB triggers; also check pocket belongs to rt
  const { data: pocket } = await supabase.from("pockets").select("rt_id").eq("id", parsed.data.pocket_id).maybeSingle();
  if (!pocket) return { ok: false, error: "Kantong tidak ditemukan" };
  if ((pocket as { rt_id: string }).rt_id !== rtId) return { ok: false, error: "Kantong bukan milik RT Anda" };

  if (parsed.data.category_id) {
    const { data: cat } = await supabase.from("categories").select("rt_id").eq("id", parsed.data.category_id).maybeSingle();
    if (!cat) return { ok: false, error: "Kategori tidak ditemukan" };
    if ((cat as { rt_id: string }).rt_id !== rtId) return { ok: false, error: "Kategori bukan milik RT Anda" };
    // category type check removed for personal app — any category allowed
  }

  const payload = {
    rt_id: rtId,
    pocket_id: parsed.data.pocket_id,
    category_id: parsed.data.category_id ?? null,
    type: parsed.data.type,
    amount: String(parsed.data.amount),
    description: parsed.data.description ?? null,
    transaction_date: parsed.data.transaction_date,
    source: "web" as const,
  };

  const { data, error } = await supabase.from("transactions").insert(payload).select("id").single();
  if (error) return { ok: false, error: error.message };

  // Optional attachment: if file provided, upload to storage bucket `attachments` (ignore if not configured)
  const file = formData.get("attachment") as File | null;
  if (file && file.size > 0 && data) {
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${rtId}/${data.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("attachments").upload(path, file, { contentType: file.type || "application/octet-stream" });
      if (!upErr) {
        const { data: urlData } = supabase.storage.from("attachments").getPublicUrl(path);
        await supabase.from("transaction_attachments").insert({
          transaction_id: data.id as string,
          file_url: urlData.publicUrl,
          file_type: file.type || null,
        });
      }
    } catch {
      // non-fatal
    }
  }

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/transaksi");
  revalidatePath(`/pockets/${parsed.data.pocket_id}`);
  return { ok: true, id: data?.id as string | undefined };
}

export async function createTransferAction(formData: FormData): Promise<ActionResult> {
  const raw = {
    from_pocket_id: formData.get("from_pocket_id"),
    to_pocket_id: formData.get("to_pocket_id"),
    amount: formData.get("amount"),
    description: formData.get("description") || null,
    transaction_date: formData.get("transaction_date") || undefined,
  };

  const parsed = transferSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return { ok: false, error: msg };
  }

  const rtId = await getCurrentRtId();
  const supabase = createServerClient();

  // Verify both pockets belong to current RT
  const { data: pockets } = await supabase.from("pockets").select("id, rt_id").in("id", [parsed.data.from_pocket_id, parsed.data.to_pocket_id]);
  const list = (pockets as { id: string; rt_id: string }[] | null) ?? [];
  if (list.length !== 2) return { ok: false, error: "Kantong tidak ditemukan" };
  if (list.some((p) => p.rt_id !== rtId)) return { ok: false, error: "Kantong bukan milik RT Anda" };

  const payload = {
    rt_id: rtId,
    from_pocket_id: parsed.data.from_pocket_id,
    to_pocket_id: parsed.data.to_pocket_id,
    amount: String(parsed.data.amount),
    description: parsed.data.description ?? null,
    transaction_date: parsed.data.transaction_date,
  };

  const { data, error } = await supabase.from("transfers").insert(payload).select("id").single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/transaksi");
  revalidatePath(`/pockets/${parsed.data.from_pocket_id}`);
  revalidatePath(`/pockets/${parsed.data.to_pocket_id}`);
  return { ok: true, id: data?.id as string | undefined };
}

export async function updateTransactionAction(id: string, formData: FormData): Promise<ActionResult> {
  const raw = {
    type: formData.get("type"),
    pocket_id: formData.get("pocket_id"),
    category_id: formData.get("category_id") || null,
    amount: formData.get("amount"),
    description: formData.get("description") || null,
    transaction_date: formData.get("transaction_date") || undefined,
    source: "web" as const,
  };

  const parsed = transactionSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return { ok: false, error: msg };
  }

  const rtId = await getCurrentRtId();
  const supabase = createServerClient();

  // ownership check — transaction must belong to RT
  const { data: existing } = await supabase.from("transactions").select("rt_id, pocket_id").eq("id", id).maybeSingle();
  if (!existing) return { ok: false, error: "Transaksi tidak ditemukan" };
  if ((existing as { rt_id: string }).rt_id !== rtId) return { ok: false, error: "Bukan transaksi RT Anda" };

  const { data: pocket } = await supabase.from("pockets").select("rt_id").eq("id", parsed.data.pocket_id).maybeSingle();
  if (!pocket) return { ok: false, error: "Kantong tidak ditemukan" };
  if ((pocket as { rt_id: string }).rt_id !== rtId) return { ok: false, error: "Kantong bukan milik RT Anda" };

  if (parsed.data.category_id) {
    const { data: cat } = await supabase.from("categories").select("rt_id").eq("id", parsed.data.category_id).maybeSingle();
    if (!cat) return { ok: false, error: "Kategori tidak ditemukan" };
    if ((cat as { rt_id: string }).rt_id !== rtId) return { ok: false, error: "Kategori bukan milik RT Anda" };
  }

  const payload = {
    pocket_id: parsed.data.pocket_id,
    category_id: parsed.data.category_id ?? null,
    type: parsed.data.type,
    amount: String(parsed.data.amount),
    description: parsed.data.description ?? null,
    transaction_date: parsed.data.transaction_date,
  };

  const { error } = await supabase.from("transactions").update(payload).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/transaksi");
  revalidatePath(`/transactions/${id}`);
  revalidatePath(`/pockets/${parsed.data.pocket_id}`);
  if ((existing as { pocket_id: string }).pocket_id !== parsed.data.pocket_id) {
    revalidatePath(`/pockets/${(existing as { pocket_id: string }).pocket_id}`);
  }
  return { ok: true, id };
}

export async function deleteTransactionAction(id: string): Promise<ActionResult> {
  const rtId = await getCurrentRtId();
  const supabase = createServerClient();

  const { data: existing } = await supabase.from("transactions").select("rt_id").eq("id", id).maybeSingle();
  if (!existing) return { ok: false, error: "Transaksi tidak ditemukan" };
  if ((existing as { rt_id: string }).rt_id !== rtId) return { ok: false, error: "Bukan transaksi RT Anda" };

  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/transaksi");
  return { ok: true, id };
}
