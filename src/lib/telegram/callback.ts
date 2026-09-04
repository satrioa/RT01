import { createServerClient } from "@/lib/supabase/server";
import { getPending, setPendingStatus } from "./pending";
import { sendMessage, answerCallbackQuery, editMessageText } from "./client";
import { formatRupiah } from "@/lib/format";

export async function handleCallback(
  callbackQueryId: string,
  telegramUserId: number,
  chatId: number,
  messageId: number | undefined,
  data: string | undefined
): Promise<void> {
  if (!data) {
    await answerCallbackQuery(callbackQueryId, "Data tidak valid");
    return;
  }

  const [action, pendingId] = data.split(":");
  if (!pendingId || !["confirm", "cancel"].includes(action)) {
    await answerCallbackQuery(callbackQueryId, "Aksi tidak dikenal");
    return;
  }

  const pending = await getPending(pendingId);
  if (!pending) {
    await answerCallbackQuery(callbackQueryId, "Transaksi tidak ditemukan atau kadaluarsa", true);
    if (messageId) await editMessageText(chatId, messageId, "Transaksi tidak ditemukan atau sudah kadaluarsa.");
    return;
  }

  if (pending.telegram_user_id !== telegramUserId) {
    await answerCallbackQuery(callbackQueryId, "Bukan untuk akun Anda", true);
    return;
  }

  if (pending.status !== "pending") {
    await answerCallbackQuery(callbackQueryId, `Sudah ${pending.status}`);
    return;
  }

  // Expiry is at row level; check if needed (DB already has status)
  // if (pending.expires_at) {} // optional

  const supabase = createServerClient();

  if (action === "cancel") {
    await setPendingStatus(pendingId, "cancelled");
    await answerCallbackQuery(callbackQueryId, "Dibatalkan");
    if (messageId) await editMessageText(chatId, messageId, "Transaksi dibatalkan.");
    else await sendMessage(chatId, "Transaksi dibatalkan.");
    return;
  }

  // confirm
  const payload = pending.payload as unknown as {
    intent: string;
    amount: number;
    type?: string;
    pocketId?: string;
    categoryId?: string | null;
    fromPocketId?: string;
    toPocketId?: string;
    description?: string | null;
    transaction_date?: string | null;
  };

  try {
    if (pending.intent_type === "create_transaction") {
      const rtId = pending.rt_id;
      // Validate pocket belongs to rt (defense)
      const { data: pocket } = await supabase.from("pockets").select("rt_id").eq("id", payload.pocketId!).maybeSingle();
      if (!pocket || (pocket as { rt_id: string }).rt_id !== rtId) {
        await answerCallbackQuery(callbackQueryId, "Validasi gagal: kantong bukan milik RT", true);
        await setPendingStatus(pendingId, "cancelled");
        return;
      }
      const insert = {
        rt_id: rtId,
        pocket_id: payload.pocketId!,
        category_id: payload.categoryId ?? null,
        type: payload.type as "income" | "expense",
        amount: String(payload.amount),
        description: payload.description ?? null,
        transaction_date: payload.transaction_date ?? new Date().toISOString().slice(0, 10),
        source: "telegram" as const,
        created_by: pending.payload as unknown as { profile_id?: string } as never,
      };
      // Use service_role to bypass RLS: supabase client uses anon but with service? For bot we use service_role if configured via SUPABASE_SERVICE_ROLE_KEY?
      // For now use same client (which may be anon). If RLS blocks, error will show.
      const { error, data } = await supabase.from("transactions").insert(insert).select("id").single();
      if (error) throw new Error(error.message);
      await setPendingStatus(pendingId, "confirmed");
      await answerCallbackQuery(callbackQueryId, "Tersimpan!");
      const amt = formatRupiah(payload.amount);
      if (messageId) await editMessageText(chatId, messageId, `✅ Tersimpan: ${payload.type === "income" ? "Pemasukan" : "Pengeluaran"} ${amt} — ${payload.description ?? ""}`);
      else await sendMessage(chatId, `✅ Tersimpan: ${payload.type === "income" ? "Pemasukan" : "Pengeluaran"} ${amt}`);
      return;
    }

    if (pending.intent_type === "create_transfer") {
      const rtId = pending.rt_id;
      const { data: pockets } = await supabase.from("pockets").select("id, rt_id").in("id", [payload.fromPocketId!, payload.toPocketId!]);
      const list = (pockets as { id: string; rt_id: string }[] | null) ?? [];
      if (list.length !== 2 || list.some((p) => p.rt_id !== rtId)) {
        await answerCallbackQuery(callbackQueryId, "Validasi gagal: kantong bukan milik RT", true);
        await setPendingStatus(pendingId, "cancelled");
        return;
      }
      const insert = {
        rt_id: rtId,
        from_pocket_id: payload.fromPocketId!,
        to_pocket_id: payload.toPocketId!,
        amount: String(payload.amount),
        description: payload.description ?? null,
        transaction_date: payload.transaction_date ?? new Date().toISOString().slice(0, 10),
      };
      const { error } = await supabase.from("transfers").insert(insert).select("id").single();
      if (error) throw new Error(error.message);
      await setPendingStatus(pendingId, "confirmed");
      await answerCallbackQuery(callbackQueryId, "Transfer tersimpan!");
      if (messageId) await editMessageText(chatId, messageId, `✅ Transfer tersimpan: ${formatRupiah(payload.amount)} — ${payload.description ?? ""}`);
      else await sendMessage(chatId, `✅ Transfer tersimpan: ${formatRupiah(payload.amount)}`);
      return;
    }

    await answerCallbackQuery(callbackQueryId, "Intent tidak dikenal");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal simpan";
    await answerCallbackQuery(callbackQueryId, msg, true);
    await sendMessage(chatId, `Gagal menyimpan: ${msg}`);
  }
}
