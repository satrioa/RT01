import { createServiceClient } from "@/lib/supabase/service";
import { getPending, setPendingStatus } from "./pending";
import { sendMessage, answerCallbackQuery, editMessageText, sendDocument } from "./client";
import { formatRupiah } from "@/lib/format";
import { getRecentTransactionsWithId } from "./service";
import { showTransactionDetailForEdit, handleFieldSelection } from "./edit";
import { buildMonthKeyboard, generateKasBopReportPdf, getMonthLabel } from "./report";

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

  // --- Edit transaksi: menu ---
  if (data === "rt:tx:edit:menu") {
    const supabase = createServiceClient();
    const { data: acc } = await supabase.from("telegram_accounts").select("rt_id").eq("telegram_user_id", telegramUserId).maybeSingle();
    if (!acc) {
      await answerCallbackQuery(callbackQueryId, "Akun belum terhubung", true);
      return;
    }
    const rtId = (acc as { rt_id: string }).rt_id;
    const txs = await getRecentTransactionsWithId(rtId, 5);
    if (txs.length === 0) {
      await answerCallbackQuery(callbackQueryId, "Belum ada transaksi");
      await sendMessage(chatId, "Belum ada transaksi untuk diedit.");
      return;
    }
    const kb = {
      inline_keyboard: txs.map((t) => {
        const sign = t.type === "income" ? "+" : "-";
        const label = `${(t.description ?? t.type).slice(0, 20)} ${sign}${formatRupiah(Number(t.amount))}`.slice(0, 36);
        return [{ text: label, callback_data: `rt:tx:edit:${t.id}` }];
      }),
    };
    await answerCallbackQuery(callbackQueryId, "Pilih transaksi");
    await sendMessage(chatId, "Pilih transaksi yang ingin diedit:", { replyMarkup: kb });
    return;
  }

  // rt:tx:edit:<transaction_id>
  if (data.startsWith("rt:tx:edit:")) {
    const txId = data.slice("rt:tx:edit:".length);
    if (!txId || txId === "menu") {
      await answerCallbackQuery(callbackQueryId, "ID tidak valid");
      return;
    }
    const supabase = createServiceClient();
    const { data: acc } = await supabase.from("telegram_accounts").select("rt_id").eq("telegram_user_id", telegramUserId).maybeSingle();
    if (!acc) {
      await answerCallbackQuery(callbackQueryId, "Akun belum terhubung", true);
      return;
    }
    const rtId = (acc as { rt_id: string }).rt_id;
    // validate ownership
    const { data: tx } = await supabase.from("transactions").select("rt_id").eq("id", txId).maybeSingle();
    if (!tx || (tx as { rt_id: string }).rt_id !== rtId) {
      await answerCallbackQuery(callbackQueryId, "Transaksi tidak ditemukan / bukan milik RT", true);
      return;
    }
    await answerCallbackQuery(callbackQueryId, "Transaksi dipilih");
    await showTransactionDetailForEdit(chatId, undefined, txId, rtId);
    // optionally edit original message to remove keyboard?
    if (messageId) {
      // keep original message, send new detail above
    }
    return;
  }

  // rt:tx:field:<transaction_id>:<field>
  if (data.startsWith("rt:tx:field:")) {
    const rest = data.slice("rt:tx:field:".length);
    const parts = rest.split(":");
    const txId = parts[0];
    const field = parts[1] as "amount" | "description" | "category" | "date" | "account" | undefined;
    if (!txId || !field || !["amount", "description", "category", "date", "account"].includes(field)) {
      await answerCallbackQuery(callbackQueryId, "Field tidak valid");
      return;
    }
    const supabase = createServiceClient();
    const { data: acc } = await supabase.from("telegram_accounts").select("rt_id").eq("telegram_user_id", telegramUserId).maybeSingle();
    if (!acc) {
      await answerCallbackQuery(callbackQueryId, "Akun belum terhubung", true);
      return;
    }
    const rtId = (acc as { rt_id: string }).rt_id;
    await handleFieldSelection(chatId, messageId, telegramUserId, rtId, txId, field as never, callbackQueryId);
    return;
  }

  // rt:tx:cancel:<transaction_id>
  if (data.startsWith("rt:tx:cancel:")) {
    await answerCallbackQuery(callbackQueryId, "Dibatalkan");
    if (messageId) await editMessageText(chatId, messageId, "Edit dibatalkan.");
    else await sendMessage(chatId, "Edit dibatalkan.");
    return;
  }

  // --- Laporan: Kas / BOP ---
  if (data === "rt:report:kas" || data === "rt:report:bop") {
    const type = data === "rt:report:kas" ? "kas" : "bop";
    const year = new Date().getFullYear();
    const kb = buildMonthKeyboard(`rt:report:${type}`);
    await answerCallbackQuery(callbackQueryId, `Laporan ${type.toUpperCase()} — pilih bulan`);
    await sendMessage(chatId, [`📅 Tahun: ${year}`, "", "Pilih bulan:"].join("\n"), { replyMarkup: kb });
    return;
  }

  // rt:report:kas:<month>  or rt:report:bop:<month>
  if (data.startsWith("rt:report:kas:") || data.startsWith("rt:report:bop:")) {
    const parts = data.split(":");
    // rt:report:kas:9
    const type = parts[2] as "kas" | "bop";
    const month = Number(parts[3]);
    const year = new Date().getFullYear();
    if (!month || month < 1 || month > 12) {
      await answerCallbackQuery(callbackQueryId, "Bulan tidak valid", true);
      return;
    }
    const supabase = createServiceClient();
    const { data: acc } = await supabase.from("telegram_accounts").select("rt_id").eq("telegram_user_id", telegramUserId).maybeSingle();
    if (!acc) {
      await answerCallbackQuery(callbackQueryId, "Akun belum terhubung", true);
      return;
    }
    const rtId = (acc as { rt_id: string }).rt_id;
    await answerCallbackQuery(callbackQueryId, `Membuat laporan ${type.toUpperCase()} ${getMonthLabel(month)} ${year}...`);
    if (messageId) await editMessageText(chatId, messageId, `📊 Membuat laporan ${type === "kas" ? "Kas" : "BOP"} ${getMonthLabel(month)} ${year}...`);
    else await sendMessage(chatId, `📊 Membuat laporan ${type === "kas" ? "Kas" : "BOP"} ${getMonthLabel(month)} ${year}...`);

    try {
      const { buffer, filename, caption } = await generateKasBopReportPdf(rtId, type, year, month);
      await sendDocument(chatId, buffer, filename, caption);
      // also send summary as message? caption already included in document
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal membuat laporan";
      console.error("[telegram report] error", e);
      await sendMessage(chatId, `❌ Gagal membuat laporan: ${msg}\nSilakan coba lagi.`);
    }
    return;
  }

  // --- Fallback: confirm/cancel for pending (create_* and update_*) ---
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

  const supabase = createServiceClient();

  if (action === "cancel") {
    await setPendingStatus(pendingId, "cancelled");
    await answerCallbackQuery(callbackQueryId, "Dibatalkan");
    if (messageId) await editMessageText(chatId, messageId, "Transaksi dibatalkan.", { inline_keyboard: [] });
    else await sendMessage(chatId, "Transaksi dibatalkan.");
    return;
  }

  // confirm — handle by intent_type
  const payload = pending.payload as unknown as {
    intent: string;
    amount?: number;
    type?: string;
    pocketId?: string;
    categoryId?: string | null;
    fromPocketId?: string;
    toPocketId?: string;
    description?: string | null;
    transaction_date?: string | null;
    transaction_id?: string;
    field?: string;
    new_value?: string | null;
  };

  try {
    if (pending.intent_type === "create_transaction") {
      const rtId = pending.rt_id;
      const { data: pocket } = await supabase.from("pockets").select("rt_id").eq("id", payload.pocketId!).maybeSingle();
      if (!pocket || (pocket as { rt_id: string }).rt_id !== rtId) {
        await answerCallbackQuery(callbackQueryId, "Validasi gagal: kantong bukan milik RT", true);
        await setPendingStatus(pendingId, "cancelled");
        return;
      }
      const { data: linked } = await supabase.from("telegram_accounts").select("profile_id").eq("telegram_user_id", telegramUserId).maybeSingle();
      const profileId = (linked as { profile_id: string } | null)?.profile_id ?? null;
      const insert = {
        rt_id: rtId,
        pocket_id: payload.pocketId!,
        category_id: payload.categoryId ?? null,
        type: payload.type as "income" | "expense",
        amount: String(payload.amount),
        description: payload.description ?? null,
        transaction_date: payload.transaction_date ?? new Date().toISOString().slice(0, 10),
        source: "telegram" as const,
        created_by: profileId,
      };
      const { error } = await supabase.from("transactions").insert(insert).select("id").single();
      if (error) throw new Error(error.message);
      await setPendingStatus(pendingId, "confirmed");
      await answerCallbackQuery(callbackQueryId, "Tersimpan!");
      const amt = formatRupiah(payload.amount ?? 0);
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
      if (messageId) await editMessageText(chatId, messageId, `✅ Transfer tersimpan: ${formatRupiah(payload.amount ?? 0)} — ${payload.description ?? ""}`);
      else await sendMessage(chatId, `✅ Transfer tersimpan: ${formatRupiah(payload.amount ?? 0)}`);
      return;
    }

    if (pending.intent_type === "update_transaction") {
      // delegate to edit handler
      const { handleEditConfirm } = await import("./edit");
      const { data: acc } = await supabase.from("telegram_accounts").select("rt_id").eq("telegram_user_id", telegramUserId).maybeSingle();
      const rtId = (acc as { rt_id: string } | null)?.rt_id ?? pending.rt_id;
      await handleEditConfirm(pendingId, chatId, telegramUserId, messageId, rtId);
      await answerCallbackQuery(callbackQueryId, "Perubahan disimpan!");
      if (messageId) await editMessageText(chatId, messageId, `✅ Perubahan disimpan.`);
      else await sendMessage(chatId, `✅ Perubahan disimpan.`);
      return;
    }

    await answerCallbackQuery(callbackQueryId, "Intent tidak dikenal");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal simpan";
    await answerCallbackQuery(callbackQueryId, msg, true);
    await sendMessage(chatId, `Gagal menyimpan: ${msg}`);
  }
}
