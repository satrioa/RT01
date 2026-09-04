import { z } from "zod";

export interface AiContext {
  pockets: string[]; // available pocket names
  categories: { name: string; type: "income" | "expense" | "both" }[];
  currentDate: string; // YYYY-MM-DD
}

// Raw AI output — validated via Zod before use
export const aiIntentSchema = z.enum([
  "create_transaction",
  "create_transfer",
  "needs_confirmation",
  "query_balance",
  "unknown",
]);

export const aiTransactionOutputSchema = z.object({
  intent: z.literal("create_transaction"),
  type: z.enum(["income", "expense"]),
  amount: z.number().int().positive(),
  pocket: z.string().trim().min(1),
  category: z.string().trim().min(1).optional().nullable(),
  description: z.string().trim().max(500).optional().nullable(),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  confidence: z.number().min(0).max(1),
});

export const aiTransferOutputSchema = z.object({
  intent: z.literal("create_transfer"),
  amount: z.number().int().positive(),
  from_pocket: z.string().trim().min(1),
  to_pocket: z.string().trim().min(1),
  description: z.string().trim().max(500).optional().nullable(),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  confidence: z.number().min(0).max(1),
});

export const aiNeedsConfirmationSchema = z.object({
  intent: z.literal("needs_confirmation"),
  needs_confirmation: z.literal(true),
  questions: z.array(z.string().min(1)).min(1),
  options: z.array(z.string()).optional(),
  partial: z.record(z.string(), z.unknown()).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export const aiQueryBalanceSchema = z.object({
  intent: z.literal("query_balance"),
  pocket: z.string().trim().min(1).optional(),
  answer: z.string().optional(),
});

export type AiTransactionOutput = z.infer<typeof aiTransactionOutputSchema>;
export type AiTransferOutput = z.infer<typeof aiTransferOutputSchema>;
export type AiNeedsConfirmation = z.infer<typeof aiNeedsConfirmationSchema>;
export type AiQueryBalance = z.infer<typeof aiQueryBalanceSchema>;

export type AiParsedResult =
  | AiTransactionOutput
  | AiTransferOutput
  | AiNeedsConfirmation
  | AiQueryBalance
  | { intent: "unknown"; raw_input: string };

export interface DeterministicResult {
  isDeterministic: true;
  result: AiQueryBalance | { intent: "query_balance"; pocket?: string; answer: string; deterministic: true };
}
