import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

// Bergantung pada sesi (cookie) — jangan di-prerender saat build.
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = createServerClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/admin/login");
  }

  redirect("/");
}
