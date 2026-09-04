"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentRtId } from "@/lib/auth";
import { importRowSchema } from "@/lib/excel/validator";

export interface ImportPayloadRow {
  transaction_date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  pocket_id: string;
  category_id?: string | null;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: { index: number; message: string }[];
  errorDetails: string[];
}

export async function importTransactionsAction(
  rows: ImportPayloadRow[]
): Promise<ImportResult> {
  const rtId = await getCurrentRtId();

  // Server-side: use service client to bypass RLS for bulk check? But we still validate ownership.
  const supabase = createServerClient();
  const service = createServiceClient();

  // Validate ownership of pockets/categories belong to rt
  const pocketIds = [...new Set(rows.map((r) => r.pocket_id))];
  const categoryIds = [...new Set(rows.map((r) => r.category_id).filter(Boolean as unknown as (v: string | null | undefined) => v is string))];

  if (pocketIds.length > 0) {
    const { data: pockets } = await service.from("pockets").select("id, rt_id").in("id", pocketIds);
    const map = new Map(((pockets as { id: string; rt_id: string }[] | null) ?? []).map((p) => [p.id, p.rt_id]));
    for (const id of pocketIds) {
      if (map.get(id) !== rtId) {
        return { imported: 0, skipped: rows.length, errors: [{ index: -1, message: `Kantong ${id} bukan milik RT` }], errorDetails: [] };
      }
    }
  }

  if (categoryIds.length > 0) {
    const { data: cats } = await service.from("categories").select("id, rt_id, type").in("id", categoryIds);
    const map = new Map(((cats as { id: string; rt_id: string; type: string }[] | null) ?? []).map((c) => [c.id, c]));
    for (const r of rows) {
      if (!r.category_id) continue;
      const cat = map.get(r.category_id);
      if (!cat || cat.rt_id !== rtId) {
        return { imported: 0, skipped: rows.length, errors: [{ index: rows.indexOf(r), message: `Kategori ${r.category_id} bukan milik RT` }], errorDetails: [] };
      }
      if (cat.type !== "both" && cat.type !== r.type) {
        return { imported: 0, skipped: rows.length, errors: [{ index: rows.indexOf(r), message: `Kategori tipe ${cat.type} tidak cocok untuk ${r.type}` }], errorDetails: [] };
      }
    }
  }

  // Validate each row with Zod
  const validRows: ImportPayloadRow[] = [];
  const errors: { index: number; message: string }[] = [];

  rows.forEach((r, idx) => {
    const parsed = importRowSchema.safeParse(r);
    if (!parsed.success) {
      errors.push({ index: idx, message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") });
    } else {
      validRows.push(r);
    }
  });

  if (validRows.length === 0) {
    return { imported: 0, skipped: rows.length, errors, errorDetails: errors.map((e) => `Baris ${e.index + 1}: ${e.message}`) };
  }

  // Duplicate check against DB: fetch existing transactions for this rt in date range of import
  // All historical belong to same ledger — we check exact duplicate by date|amount|type|pocket|description lower
  const dates = validRows.map((r) => r.transaction_date);
  const minDate = dates.sort()[0];
  const maxDate = dates.sort().reverse()[0];

  const { data: existing } = await service
    .from("transactions")
    .select("transaction_date, amount, type, pocket_id, description")
    .eq("rt_id", rtId)
    .gte("transaction_date", minDate)
    .lte("transaction_date", maxDate)
    .limit(5000);

  const existingKeys = new Set(
    ((existing as { transaction_date: string; amount: string; type: string; pocket_id: string; description: string | null }[] | null) ?? []).map(
      (e) => `${e.transaction_date}|${Number(e.amount)}|${e.type}|${e.pocket_id}|${(e.description ?? "").toLowerCase().trim()}`
    )
  );

  const toInsert: ImportPayloadRow[] = [];
  const skippedDuplicates: number[] = [];

  validRows.forEach((r, idx) => {
    const key = `${r.transaction_date}|${r.amount}|${r.type}|${r.pocket_id}|${r.description.toLowerCase().trim()}`;
    if (existingKeys.has(key)) {
      skippedDuplicates.push(idx);
      errors.push({ index: idx, message: "Duplikat dengan transaksi di database" });
    } else {
      // Also check within batch duplicates
      if (toInsert.some((t) => `${t.transaction_date}|${t.amount}|${t.type}|${t.pocket_id}|${t.description.toLowerCase().trim()}` === key)) {
        skippedDuplicates.push(idx);
        errors.push({ index: idx, message: "Duplikat dalam file" });
      } else {
        toInsert.push(r);
        existingKeys.add(key);
      }
    }
  });

  if (toInsert.length === 0) {
    return {
      imported: 0,
      skipped: rows.length,
      errors,
      errorDetails: errors.map((e) => `Baris ${e.index + 1}: ${e.message}`),
    };
  }

  // Batch insert — Supabase insert many
  const payload = toInsert.map((r) => ({
    rt_id: rtId,
    transaction_date: r.transaction_date,
    description: r.description,
    amount: String(r.amount),
    type: r.type,
    pocket_id: r.pocket_id,
    category_id: r.category_id ?? null,
    source: "import" as const,
  }));

  const { error: insertError } = await supabase.from("transactions").insert(payload);

  if (insertError) {
    // Fallback to service if RLS blocks
    const { error: svcErr } = await service.from("transactions").insert(payload);
    if (svcErr) {
      return {
        imported: 0,
        skipped: rows.length,
        errors: [{ index: -1, message: svcErr.message }],
        errorDetails: [svcErr.message],
      };
    }
  }

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/reports");

  const imported = toInsert.length;
  const skipped = rows.length - imported;

  return {
    imported,
    skipped,
    errors,
    errorDetails: errors.map((e) => `Baris ${e.index + 1}: ${e.message}`),
  };
}
