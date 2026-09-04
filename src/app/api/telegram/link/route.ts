import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { DEV_RT_ID } from "@/lib/env";

export const dynamic = "force-dynamic";

function generateCode(length = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function POST() {
  try {
    const supabase = createServiceClient();
    // In Phase 7 without real auth, use DEV_RT_ID and try to resolve profile
    const rtId = DEV_RT_ID;

    // Try to find a profile for this RT to attach linking code to (fallback to first)
    const { data: profiles } = await supabase.from("profiles").select("id").eq("rt_id", rtId).limit(1);
    let profileId = (profiles as { id: string }[] | null)?.[0]?.id;

    // If no profile, create a synthetic one id? For dev, create a fallback UUID
    if (!profileId) {
      // No profile exists — create a temporary linking code without profile constraint?
      // We will use rtId as profile placeholder? Instead we fetch rt_profiles and create a profile-like entry in memory
      // Simplistic: use rtId as profile_id fallback (may violate FK if not exists, so create code with rtId but need valid profile_id)
      // As last resort, insert a dummy profile if auth user not exist — but profiles FK to auth.users, so dummy will fail.
      // For dev, we generate code with a placeholder UUID that will be accepted if FK disabled? Instead we try to find any profile globally.
      const { data: anyProfile } = await supabase.from("profiles").select("id, rt_id").limit(1).maybeSingle();
      if (anyProfile) {
        profileId = (anyProfile as { id: string }).id;
      } else {
        // No profiles at all — still create code with a dummy but will fail FK; so create a code without profile FK via service bypass?
        // We will insert with a random UUID and rely on RLS service_role bypass? FK still enforced.
        // For now return error with guidance.
        return NextResponse.json({ ok: false, error: "Belum ada profile di RT ini. Buat user dulu di Supabase." }, { status: 400 });
      }
    }

    let code = "";
    let attempts = 0;
    let inserted: { code: string } | null = null;
    while (attempts < 5 && !inserted) {
      code = generateCode(6);
      const { data, error } = await supabase
        .from("telegram_link_codes")
        .insert({ code, rt_id: rtId, profile_id: profileId })
        .select("code")
        .single();
      if (!error && data) inserted = data as { code: string };
      else attempts++;
    }

    if (!inserted) return NextResponse.json({ ok: false, error: "Gagal buat kode, coba lagi." }, { status: 500 });

    return NextResponse.json({ ok: true, code: inserted.code, expiresIn: "15 menit" });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, hint: "POST to generate linking code. Use TELEGRAM_BOT_TOKEN env for webhook." });
}
