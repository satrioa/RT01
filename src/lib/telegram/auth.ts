import { createServerClient } from "@/lib/supabase/server";
import type { TelegramAccount } from "./types";

/**
 * Returns linked account or null. Never allow unknown Telegram accounts to write.
 */
export async function getLinkedAccount(telegramUserId: number): Promise<TelegramAccount | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("telegram_accounts")
    .select("*")
    .eq("telegram_user_id", telegramUserId)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as TelegramAccount;
}

export async function isLinked(telegramUserId: number): Promise<boolean> {
  const acc = await getLinkedAccount(telegramUserId);
  return acc !== null;
}

export async function linkByCode(
  telegramUserId: number,
  telegramUsername: string | undefined,
  chatId: number,
  code: string
): Promise<{ ok: boolean; message: string }> {
  const supabase = createServerClient();
  const normalized = code.trim().toUpperCase();

  const { data: codeRow, error } = await supabase
    .from("telegram_link_codes")
    .select("*")
    .eq("code", normalized)
    .maybeSingle();

  if (error || !codeRow) return { ok: false, message: "Kode tidak ditemukan. Cek kode di web app (Pengaturan → Telegram)." };

  const row = codeRow as unknown as {
    id: string;
    rt_id: string;
    profile_id: string;
    expires_at: string;
    used_at: string | null;
  };

  if (row.used_at) return { ok: false, message: "Kode sudah digunakan. Buat kode baru di web app." };
  if (new Date(row.expires_at).getTime() < Date.now()) return { ok: false, message: "Kode kadaluarsa. Buat kode baru." };

  // Check if telegram user already linked
  const existing = await getLinkedAccount(telegramUserId);
  if (existing) {
    // Allow relink — update
    const { error: upErr } = await supabase
      .from("telegram_accounts")
      .update({
        telegram_username: telegramUsername ?? null,
        chat_id: chatId,
        rt_id: row.rt_id,
        profile_id: row.profile_id,
        linked_at: new Date().toISOString(),
      })
      .eq("telegram_user_id", telegramUserId);
    if (upErr) return { ok: false, message: `Gagal update link: ${upErr.message}` };
  } else {
    const { error: insErr } = await supabase.from("telegram_accounts").insert({
      telegram_user_id: telegramUserId,
      telegram_username: telegramUsername ?? null,
      chat_id: chatId,
      rt_id: row.rt_id,
      profile_id: row.profile_id,
    });
    if (insErr) {
      if (insErr.message.includes("duplicate")) return { ok: false, message: "Akun Telegram sudah terhubung." };
      return { ok: false, message: `Gagal menghubungkan: ${insErr.message}` };
    }
  }

  // Mark code used
  await supabase.from("telegram_link_codes").update({ used_at: new Date().toISOString() }).eq("id", row.id);

  return { ok: true, message: "Akun Telegram berhasil dihubungkan! Sekarang Anda bisa kirim transaksi, mis. 'Beli konsumsi 75 ribu dari Kas'." };
}

export async function unlinkAccount(telegramUserId: number): Promise<void> {
  const supabase = createServerClient();
  await supabase.from("telegram_accounts").delete().eq("telegram_user_id", telegramUserId);
}
