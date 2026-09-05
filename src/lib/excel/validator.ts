import { z } from "zod";
import { parseExcelAmount, parseExcelDate } from "./parser";

export type ColumnMapping = {
  date: string | null;
  description: string | null;
  income: string | null;
  expense: string | null;
  amount: string | null; // alternative single amount column
  pocket: string | null;
  category: string | null;
};

export interface RowValidation {
  index: number; // 0-based data row index
  raw: Record<string, unknown>;
  parsed: {
    date: string | null;
    description: string | null;
    amount: number | null;
    type: "income" | "expense" | null;
    pocketName: string | null;
    categoryName: string | null;
  };
  errors: string[];
  warnings: string[];
  isValid: boolean;
  isDuplicate: boolean;
  duplicateKey?: string;
}

export function validateRows(
  rows: Record<string, unknown>[],
  mapping: ColumnMapping,
  options: {
    pockets: { id: string; name: string }[];
    categories: { id: string; name: string; type: string }[];
    defaultPocketId?: string | null;
    categoryMapping?: Record<string, string>; // excel category -> category id
    existingKeys?: Set<string>; // for duplicate check against DB
  }
): RowValidation[] {
  const pocketMap = new Map(options.pockets.map((p) => [p.name.toLowerCase().trim(), p.id]));
  const categoryMap = new Map(options.categories.map((c) => [c.name.toLowerCase().trim(), c.id]));
  const categoryTypeMap = new Map(options.categories.map((c) => [c.id, c.type]));

  const seen = new Set<string>();
  const existing = options.existingKeys ?? new Set<string>();

  return rows.map((row, idx) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Description
    const descRaw = mapping.description ? String(row[mapping.description] ?? "").trim() : "";
    const description = descRaw || null;
    if (!description) errors.push("Deskripsi kosong");

    // Date
    const dateRaw = mapping.date ? row[mapping.date] : null;
    const date = parseExcelDate(dateRaw);
    if (!date) errors.push("Tanggal tidak valid");

    // Amount logic: income, expense, or amount column
    let amount: number | null = null;
    let type: "income" | "expense" | null = null;

    const incomeRaw = mapping.income ? row[mapping.income] : null;
    const expenseRaw = mapping.expense ? row[mapping.expense] : null;
    const amountRaw = mapping.amount ? row[mapping.amount] : null;

    const incomeVal = parseExcelAmount(incomeRaw);
    const expenseVal = parseExcelAmount(expenseRaw);
    const amountVal = parseExcelAmount(amountRaw);

    // Kosong = 0 (tidak dianggap mengisi). 0 tidak error, hanya diabaikan.
    const hasIncome = incomeVal !== null && incomeVal !== 0;
    const hasExpense = expenseVal !== null && expenseVal !== 0;
    const hasAmount = amountVal !== null && amountVal !== 0;

    if (hasIncome && hasExpense) {
      errors.push("Isi Pemasukan atau Pengeluaran saja, tidak keduanya");
    } else if (hasIncome) {
      if (incomeVal! < 0) errors.push("Nominal pemasukan tidak boleh negatif");
      else {
        amount = Math.abs(incomeVal!);
        type = "income";
      }
    } else if (hasExpense) {
      if (expenseVal! < 0) errors.push("Nominal pengeluaran tidak boleh negatif");
      else {
        amount = Math.abs(expenseVal!);
        type = "expense";
      }
    } else if (hasAmount) {
      if (amountVal! < 0) errors.push("Nominal tidak boleh negatif");
      else {
        amount = Math.abs(amountVal!);
        // Infer type from sign or category? If amount column has negative for expense? For now require explicit? Treat positive as income? But need mapping — if amount column exists, we need to infer from separate? Simpler: if amount column used, treat as expense if description contains 'keluar', else income? But spec says Income/Expense columns separate — so amount fallback is ambiguous. Mark warning.
        // We treat amount as expense if amount column is used without income/expense: default to expense but warn
        type = "expense";
        warnings.push("Kolom Amount dipakai — diasumsikan pengeluaran, periksa tipe");
      }
    } else {
      // Kosong = 0 — baris tanpa nominal dianggap 0, tidak error
      warnings.push("Nominal kosong — dianggap 0");
      amount = 0;
      type = "expense";
    }

    if (amount !== null && (!Number.isFinite(amount) || amount < 0)) {
      errors.push("Nominal tidak valid");
      amount = null;
      type = null;
    }

    // Pocket
    let pocketName: string | null = null;
    let pocketId: string | undefined;
    if (mapping.pocket) {
      const rawPocket = String(row[mapping.pocket] ?? "").trim();
      pocketName = rawPocket || null;
      if (!pocketName) {
        if (options.defaultPocketId) {
          const def = options.pockets.find((p) => p.id === options.defaultPocketId);
          pocketName = def?.name ?? null;
          pocketId = options.defaultPocketId ?? undefined;
        } else {
          errors.push("Kantong kosong");
        }
      } else {
        const found = pocketMap.get(pocketName.toLowerCase());
        if (!found) {
          errors.push(`Kantong tidak dikenal: "${pocketName}"`);
        } else {
          pocketId = found;
        }
      }
    } else {
      if (options.defaultPocketId) {
        const def = options.pockets.find((p) => p.id === options.defaultPocketId);
        pocketName = def?.name ?? null;
        pocketId = options.defaultPocketId ?? undefined;
      } else {
        errors.push("Mapping kantong belum dipilih");
      }
    }

    // Category
    let categoryName: string | null = null;
    let categoryId: string | undefined | null = null;
    if (mapping.category) {
      const rawCat = String(row[mapping.category] ?? "").trim();
      categoryName = rawCat || null;
      if (!categoryName) {
        warnings.push("Kategori kosong — akan tanpa kategori");
      } else {
        // Check mapping override
        if (options.categoryMapping && options.categoryMapping[rawCat]) {
          categoryId = options.categoryMapping[rawCat];
        } else {
          const found = categoryMap.get(categoryName.toLowerCase());
          if (!found) {
            errors.push(`Kategori tidak dikenal: "${categoryName}"`);
          } else {
            categoryId = found;
            // Type compatibility warning
            if (type && categoryId) {
              const catType = categoryTypeMap.get(categoryId);
              if (catType && catType !== "both" && catType !== type) {
                errors.push(`Kategori "${categoryName}" tipe ${catType} tidak cocok untuk ${type}`);
              }
            }
          }
        }
      }
    }

    // Duplicate detection: key = date|amount|type|pocketId|description (lower)
    let duplicateKey: string | undefined;
    let isDuplicate = false;
    if (date && amount !== null && type && pocketId) {
      duplicateKey = `${date}|${amount}|${type}|${pocketId}|${(description ?? "").toLowerCase().trim()}`;
      if (existing.has(duplicateKey) || seen.has(duplicateKey)) {
        isDuplicate = true;
        warnings.push("Duplikat dengan transaksi lain");
      }
      seen.add(duplicateKey);
    }

    const isValid = errors.length === 0 && !isDuplicate;

    return {
      index: idx,
      raw: row,
      parsed: {
        date,
        description,
        amount,
        type,
        pocketName,
        categoryName,
      },
      errors,
      warnings,
      isValid,
      isDuplicate,
      duplicateKey,
    };
  });
}

export const importRowSchema = z.object({
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().trim().min(1).max(500),
  amount: z.number().int().min(0),
  type: z.enum(["income", "expense"]),
  pocket_id: z.string().uuid(),
  category_id: z.string().uuid().nullable().optional(),
});
