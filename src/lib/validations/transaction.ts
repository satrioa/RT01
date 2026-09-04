import { z } from "zod";

export const transactionTypeSchema = z.enum(["income", "expense"]);
export const transactionSourceSchema = z.enum([
  "web",
  "telegram",
  "whatsapp",
  "import",
]);

// Accepts string "1.500.000" or number; normalizes
const amountSchema = z
  .union([z.number(), z.string()])
  .transform((v) => (typeof v === "string" ? Number(v.replace(/[,\s.]/g, "")) : v))
  .pipe(
    z
      .number()
      .finite()
      .positive("Amount must be positive")
      .max(999_999_999_999_99, "Amount too large")
  );

// Helper to normalize amount that may be formatted with dots/commas for IDR
function normalizeAmount(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    // "1.500.000" or "1500000" or "1,500,000" — strip non-digits except decimal dot
    const cleaned = v.replace(/\s/g, "").replace(/\./g, "").replace(/,/g, ".");
    const n = Number(cleaned);
    if (Number.isNaN(n)) return NaN;
    return n;
  }
  return NaN;
}

const baseSchema = z.object({
  pocket_id: z.string().uuid(),
  category_id: z.string().uuid().optional().nullable(),
  type: transactionTypeSchema,
  amount: z
    .union([z.number(), z.string()])
    .transform((v) => normalizeAmount(v))
    .pipe(
      z
        .number()
        .finite()
        .positive("Amount must be positive")
        .max(999_999_999_999_99, "Amount too large")
        .refine((n) => Math.round(n * 100) / 100 === n, {
          message: "At most 2 decimal places",
        })
    ),
  description: z.string().trim().max(500).optional().nullable(),
  transaction_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .optional()
    .default(() => new Date().toISOString().slice(0, 10)),
  source: transactionSourceSchema.optional().default("web"),
  rt_id: z.string().uuid().optional(),
});

export const transactionSchema = baseSchema;

export type TransactionInput = z.infer<typeof transactionSchema>;

/** AI parser output — never trusted without re-validation */
export const transactionTypeWithTransferSchema = z.enum([
  "income",
  "expense",
  "transfer",
]);

export const aiParsedTransactionSchema = z.object({
  type: transactionTypeWithTransferSchema,
  amount: amountSchema,
  pocket: z.string().trim().min(1).optional(),
  from_pocket: z.string().trim().min(1).optional(),
  to_pocket: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).optional(),
  description: z.string().trim().max(500).optional(),
  confidence: z.number().min(0).max(1),
  raw_input: z.string().min(1),
});

export type AiParsedTransactionInput = z.infer<
  typeof aiParsedTransactionSchema
>;
