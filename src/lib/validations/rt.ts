import { z } from "zod";

export const rtProfileSchema = z.object({
  name: z.string().trim().min(1).max(100),
  rt_number: z.string().trim().min(1).max(10),
  rw_number: z.string().trim().min(1).max(10),
  address: z.string().trim().max(200).optional().nullable(),
  kelurahan: z.string().trim().max(100).optional().nullable(),
  kecamatan: z.string().trim().max(100).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
});

export type RtProfileInput = z.infer<typeof rtProfileSchema>;
