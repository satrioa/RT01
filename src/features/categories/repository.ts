import type { SupabaseClient } from "@supabase/supabase-js";
import { categorySchema } from "@/lib/validations/category";
import type { Category } from "@/types/database";

export async function listCategories(
  supabase: SupabaseClient,
  rtId: string
): Promise<{ data: Category[] | null; error: unknown }> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("rt_id", rtId)
    .eq("is_active", true)
    .order("name", { ascending: true });
  return { data: data as Category[] | null, error };
}

export async function createCategory(
  supabase: SupabaseClient,
  rtId: string,
  input: unknown
): Promise<{ data: Category | null; error: unknown }> {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.flatten() };
  const { data, error } = await supabase
    .from("categories")
    .insert({ rt_id: rtId, ...parsed.data })
    .select()
    .single();
  return { data: data as Category | null, error };
}
