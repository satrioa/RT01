import { z } from "zod";

export const pocketSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(50),
  description: z.string().trim().max(200).optional().nullable(),
  icon: z.string().trim().max(50).optional().nullable(),
  color: z.string().trim().max(20).optional().nullable(),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().min(0).default(0),
});

export type PocketInput = z.infer<typeof pocketSchema>;
