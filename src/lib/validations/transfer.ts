import { z } from "zod";

// Amount: accept string "150000" or number 150000, validate positive, <= 999e12, 2 decimals
const amountSchema = z
  .union([z.number(), z.string()])
  .transform((v) => (typeof v === "string" ? Number(v.replace(/[,\s]/g, "")) : v))
  .pipe(
    z
      .number()
      .finite()
      .positive("Amount must be positive")
      .max(999_999_999_999_99, "Amount too large")
      .refine((n) => Number.isFinite(n) && Math.round(n * 100) / 100 === n, {
        message: "Amount may have at most 2 decimal places",
      })
  );

export const transferSchema = z
  .object({
    from_pocket_id: z.string().uuid(),
    to_pocket_id: z.string().uuid(),
    amount: amountSchema,
    description: z.string().trim().max(500).optional().nullable(),
    transaction_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
      .optional()
      .default(() => new Date().toISOString().slice(0, 10)),
    rt_id: z.string().uuid().optional(), // set server-side from auth; optional at validation boundary
  })
  .superRefine((val, ctx) => {
    if (val.from_pocket_id === val.to_pocket_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["to_pocket_id"],
        message: "from_pocket and to_pocket must be different",
      });
    }
  });

export type TransferInput = z.infer<typeof transferSchema>;
