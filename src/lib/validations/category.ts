import { z } from "zod";

export const categoryTypeSchema = z.enum(["income", "expense", "both"]);

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(50),
  type: categoryTypeSchema,
  is_active: z.boolean().default(true),
});

export type CategoryInput = z.infer<typeof categorySchema>;
