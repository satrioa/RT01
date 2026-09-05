import { createServiceClient } from "@/lib/supabase/service";
import { formatRupiah } from "@/lib/format";
import { createPending, getActiveEditPending, setPendingStatus } from "./pending";
import { sendMessage, answerCallbackQuery, editMessageText } from "./client";

type EditField = "amount" | "description" | "category" | "date" | "account";

const FIELD_LABEL: Record<EditField, string> = {
  amount: "💰 Nominal",
  description: "📝 Keterangan",
  category: "🏷️ Kategori",
  date: "📅 Tanggal",
  account: "💳 Kantong",
};

export function buildEditFieldKeyboard(transactionId: string): { inline_keyboard: { text: string; callback_data: string }[][] } {
  return {
    inline_keyboard: [
      [
        { text: FIELD_LABEL.amount, callback_data: `rt:tx:field:${transactionId}:amount` },
        { text: FIELD_LABEL.description, callback_data: `rt:tx:field:${transactionId}:description` },
      ],
      [
        { text: FIELD_LABEL.category, callback_data: `rt:tx:field:${transactionId}:category` },
        { text: FIELD_LABEL.date, callback_data: `rt:tx:field:${transactionId}:date` },
      ],
      [
        { text: FIELD_LABEL.account, callback_data: `rt:tx:field:${transactionId}:account` },
      ],
      [{ text: "❌ Batal", callback_data: `rt:tx:cancel:${transactionId}` }],
    ],
  };
}

export function buildTransactionListKeyboard(
  transactions: { id: string; description: string | null; amount: string; type: string; transaction_date: string }[]
): { inline_keyboard: { text: string; callback_data: string }[][] } {
  const rows = transactions.map((t) => {
    const sign = t.type === "income" ? "+" : "-";
    const label = `${t.description?.slice(0, 18) ?? t.type} ${sign}${formatRupiah(Number(t.amount)).slice(0, 12)}`.slice(0, 32);
    return [{ text: label, callback_data: `rt:tx:edit:${t.id}` }];
  });
  return { inline_keyboard: rows };
}

export async function showTransactionDetailForEdit(
  chatId: number,
  messageId: number | undefined,
  transactionId: string,
  rtId: string
): Promise<void> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("transactions")
    .select("id, amount, type, description, transaction_date, pocket:pockets(name), category:categories(name)")
    .eq("id", transactionId)
    .eq("rt_id", rtId)
    .maybeSingle();
  if (!data) {
    if (messageId) await editMessageText(chatId, messageId, "Transaksi tidak ditemukan.");
    else await sendMessage(chatId, "Transaksi tidak ditemukan.");
    return;
  }
  const t = data as unknown as {
    id: string;
    amount: string;
    type: string;
    description: string | null;
    transaction_date: string;
    pocket: { name: string } | null;
    category: { name: string } | null;
  };
  const title = t.type === "income" ? "Pemasukan" : "Pengeluaran";
  const text = [
    "✏️ Edit Transaksi",
    "",
    title,
    formatRupiah(Number(t.amount)),
    t.description ?? "-",
    new Date(t.transaction_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }),
    `Kantong: ${t.pocket?.name ?? "-"}`,
    `Kategori: ${t.category?.name ?? "-"}`,
    "",
    "Apa yang ingin diubah?",
  ].join("\n");

  const kb = buildEditFieldKeyboard(t.id);
  if (messageId) {
    await editMessageText(chatId, messageId, text, kb);
  } else {
    await sendMessage(chatId, text, { replyMarkup: kb });
  }
}

export async function handleFieldSelection(
  chatId: number,
  messageId: number | undefined,
  telegramUserId: number,
  rtId: string,
  transactionId: string,
  field: EditField,
  callbackQueryId: string
): Promise<void> {
  // validate transaction exists and belongs to rt
  const supabase = createServiceClient();
  const { data: tx } = await supabase.from("transactions").select("id, rt_id, amount, description, category_id, transaction_date, pocket_id").eq("id", transactionId).maybeSingle();
  if (!tx || (tx as { rt_id: string }).rt_id !== rtId) {
    await answerCallbackQuery(callbackQueryId, "Transaksi tidak ditemukan / bukan milik RT", true);
    return;
  }

  const t = tx as { id: string; amount: string; description: string | null; category_id: string | null; transaction_date: string; pocket_id: string };
  let oldValue: string | null = null;
  let prompt = "";
  switch (field) {
    case "amount":
      oldValue = t.amount;
      prompt = `Masukkan nominal baru (angka saja, contoh: 500000). Nilai lama: ${formatRupiah(Number(oldValue))}`;
      break;
    case "description":
      oldValue = t.description;
      prompt = `Masukkan keterangan baru. Lama: "${oldValue ?? "-"}"`;
      break;
    case "category":
      // fetch categories for prompt
      const { data: cats } = await supabase.from("categories").select("name").eq("rt_id", rtId).eq("is_active", true).order("name");
      const catList = ((cats as { name: string }[] | null) ?? []).map((c) => c.name).join(", ");
      oldValue = t.category_id ?? "";
      // need category name for display
      let catName = "-";
      if (t.category_id) {
        const { data: cat } = await supabase.from("categories").select("name").eq("id", t.category_id).maybeSingle();
        catName = (cat as { name: string } | null)?.name ?? "-";
      }
      prompt = `Masukkan kategori baru. Lama: ${catName}\nTersedia: ${catList}\nKetik persis nama kategori (atau kosongkan untuk hapus).`;
      break;
    case "date":
      oldValue = t.transaction_date;
      prompt = `Masukkan tanggal baru format YYYY-MM-DD (contoh: 2026-09-05). Lama: ${oldValue}`;
      break;
    case "account":
      const { data: pockets } = await supabase.from("pockets").select("name").eq("rt_id", rtId).eq("is_active", true).order("sort_order");
      const pocketList = ((pockets as { name: string }[] | null) ?? []).map((p) => p.name).join(", ");
      const { data: pocketRow } = await supabase.from("pockets").select("name").eq("id", t.pocket_id).maybeSingle();
      const pocketName = (pocketRow as { name: string } | null)?.name ?? "-";
      oldValue = pocketName;
      prompt = `Masukkan kantong baru. Lama: ${pocketName}\nTersedia: ${pocketList}\nKetik persis nama kantong.`;
      break;
  }

  // create pending for next message input
  await createPending(telegramUserId, chatId, rtId, "update_transaction", {
    intent: "update_transaction",
    transaction_id: transactionId,
    field,
    old_value: oldValue,
    description: null,
  });

  await answerCallbackQuery(callbackQueryId, `Edit ${FIELD_LABEL[field]}`);
  const text = [`✏️ Ubah ${FIELD_LABEL[field]}`, "", prompt, "", "Ketik nilai baru, atau /cancel untuk batal."].join("\n");
  // We cannot directly edit to ask input, send new message with pendingId hidden? Use pendingId in message to track?
  // Send new message; subsequent user message will be treated as input for this pending.
  await sendMessage(chatId, text);
  // Optionally store pendingId in message? Not needed, we will fetch latest active pending for this user/chat.
}

export async function handleEditInput(
  chatId: number,
  telegramUserId: number,
  text: string,
  rtId: string
): Promise<boolean> {
  // check active edit pending
  const active = await getActiveEditPending(telegramUserId, chatId);
  if (!active) return false;

  const payload = active.payload as unknown as { transaction_id: string; field: EditField; old_value: string | null };
  const transactionId = payload.transaction_id;
  const field = payload.field;
  const trimmed = text.trim();

  if (trimmed === "/cancel") {
    await setPendingStatus(active.id, "cancelled");
    await sendMessage(chatId, "Edit dibatalkan.");
    return true;
  }

  // validate new value
  let newValue: string | null = trimmed;
  let displayNew = trimmed;
  let validationError: string | null = null;
  const supabase = createServiceClient();

  // fetch transaction for validation
  const { data: tx } = await supabase.from("transactions").select("id, rt_id, type, pocket_id, category_id, amount, description, transaction_date").eq("id", transactionId).maybeSingle();
  if (!tx || (tx as { rt_id: string }).rt_id !== rtId) {
    await sendMessage(chatId, "Transaksi tidak ditemukan / bukan milik RT. Edit dibatalkan.");
    await setPendingStatus(active.id, "cancelled");
    return true;
  }

  switch (field) {
    case "amount": {
      const num = Number(trimmed.replace(/[^\d.-]/g, ""));
      if (!Number.isFinite(num) || num <= 0) validationError = "Nominal harus angka >0. Contoh: 500000";
      else {
        // also check amount max? Use same validation as transactionSchema: >0, NUMERIC(15,2)
        if (num > 9999999999999) validationError = "Nominal terlalu besar";
        else {
          newValue = String(num);
          displayNew = formatRupiah(num);
        }
      }
      break;
    }
    case "description": {
      if (trimmed.length > 500) validationError = "Keterangan max 500 karakter";
      else newValue = trimmed || null;
      break;
    }
    case "category": {
      if (!trimmed) {
        newValue = null;
      } else {
        const { data: cat } = await supabase.from("categories").select("id, name, type").eq("rt_id", rtId).ilike("name", trimmed).maybeSingle();
        if (!cat) {
          // try exact case-insensitive via list
          const { data: cats } = await supabase.from("categories").select("id, name").eq("rt_id", rtId);
          const found = ((cats as { id: string; name: string }[] | null) ?? []).find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
          if (!found) validationError = `Kategori "${trimmed}" tidak ditemukan. Ketik persis nama kategori atau kosongkan.`;
          else {
            // check type compatibility? For personal app, any category allowed, but we check if category type incompatible? We'll allow both.
            newValue = found.id;
            displayNew = found.name;
          }
        } else {
          newValue = (cat as { id: string }).id;
          displayNew = (cat as { name: string }).name;
        }
      }
      break;
    }
    case "date": {
      const d = new Date(trimmed);
      if (isNaN(d.getTime()) || !/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) validationError = "Format tanggal harus YYYY-MM-DD, contoh: 2026-09-05";
      else {
        // also check transaction_date not future beyond now+1 day?
        newValue = trimmed;
      }
      break;
    }
    case "account": {
      const { data: pocket } = await supabase.from("pockets").select("id, name").eq("rt_id", rtId).ilike("name", trimmed).maybeSingle();
      if (!pocket) {
        const { data: pockets } = await supabase.from("pockets").select("id, name").eq("rt_id", rtId);
        const found = ((pockets as { id: string; name: string }[] | null) ?? []).find((p) => p.name.toLowerCase() === trimmed.toLowerCase());
        if (!found) validationError = `Kantong "${trimmed}" tidak ditemukan. Tersedia: ${((pockets as { name: string }[] | null) ?? []).map((p) => p.name).join(", ")}`;
        else {
          newValue = found.id;
          displayNew = found.name;
        }
      } else {
        newValue = (pocket as { id: string }).id;
        displayNew = (pocket as { name: string }).name;
      }
      break;
    }
  }

  if (validationError) {
    await sendMessage(chatId, `❌ ${validationError}\n\nCoba lagi, atau /cancel untuk batal.`);
    return true;
  }

  // fetch old display for confirmation
  let oldDisplay = payload.old_value ?? "-";
  if (field === "amount") oldDisplay = formatRupiah(Number(oldDisplay));
  else if (field === "category" && payload.old_value) {
    const { data: oldCat } = await supabase.from("categories").select("name").eq("id", payload.old_value as string).maybeSingle();
    oldDisplay = (oldCat as { name: string } | null)?.name ?? oldDisplay;
    // if newValue is id, we already have displayNew as name, else if null, display "-"
    if (newValue === null) displayNew = "-";
  } else if (field === "account") {
    // old_value was pocket name, newValue is id, we have displayNew
    if (newValue === null) displayNew = "-";
  }

  // update pending payload to include new_value, then ask confirmation
  const supabase2 = createServiceClient();
  await supabase2
    .from("telegram_pending_confirmations")
    .update({
      payload: {
        ...payload,
        new_value: newValue,
        display_new: displayNew,
        display_old: oldDisplay,
      } as unknown as Record<string, unknown>,
    })
    .eq("id", active.id);

  const confirmText = [
    "Konfirmasi perubahan:",
    "",
    `${FIELD_LABEL[field]}:`,
    `Lama: ${oldDisplay}`,
    `Baru: ${displayNew}`,
    "",
    "Lanjutkan?",
  ].join("\n");

  const kb = {
    inline_keyboard: [
      [
        { text: "✅ Simpan", callback_data: `confirm:${active.id}` },
        { text: "❌ Batal", callback_data: `cancel:${active.id}` },
      ],
    ],
  };
  await sendMessage(chatId, confirmText, { replyMarkup: kb });
  return true;
}

export async function handleEditConfirm(
  pendingId: string,
  chatId: number,
  telegramUserId: number,
  messageId: number | undefined,
  rtId: string
): Promise<void> {
  const supabase = createServiceClient();
  const { data: pendingRow } = await supabase.from("telegram_pending_confirmations").select("*").eq("id", pendingId).maybeSingle();
  if (!pendingRow) throw new Error("Pending tidak ditemukan");
  const pending = pendingRow as unknown as { rt_id: string; payload: { transaction_id: string; field: EditField; new_value: string | null; old_value: string | null }; status: string; telegram_user_id: number };
  if (pending.telegram_user_id !== telegramUserId) throw new Error("Bukan milik Anda");
  if (pending.status !== "pending") throw new Error(`Sudah ${pending.status}`);

  const { transaction_id, field, new_value } = pending.payload;
  // fetch transaction and validate ownership
  const { data: tx } = await supabase.from("transactions").select("rt_id, pocket_id, category_id, type, amount, description, transaction_date").eq("id", transaction_id).maybeSingle();
  if (!tx) throw new Error("Transaksi tidak ditemukan");
  if ((tx as { rt_id: string }).rt_id !== rtId) throw new Error("Bukan transaksi RT Anda");

  const updatePayload: Record<string, unknown> = {};
  switch (field) {
    case "amount":
      updatePayload.amount = String(new_value);
      break;
    case "description":
      updatePayload.description = new_value;
      break;
    case "category":
      updatePayload.category_id = new_value;
      // need to ensure category type compatible? For personal app, allow any, but check if category belongs to RT
      if (new_value) {
        const { data: cat } = await supabase.from("categories").select("rt_id, type").eq("id", new_value as string).maybeSingle();
        if (!cat) throw new Error("Kategori tidak ditemukan");
        if ((cat as { rt_id: string }).rt_id !== rtId) throw new Error("Kategori bukan milik RT");
        // allow both type vs transaction type? Skip strict check for personal app
      }
      break;
    case "date":
      updatePayload.transaction_date = new_value;
      break;
    case "account":
      updatePayload.pocket_id = new_value;
      // validate pocket belongs to RT
      const { data: pocket } = await supabase.from("pockets").select("rt_id").eq("id", new_value as string).maybeSingle();
      if (!pocket) throw new Error("Kantong tidak ditemukan");
      if ((pocket as { rt_id: string }).rt_id !== rtId) throw new Error("Kantong bukan milik RT");
      break;
  }

  const { error } = await supabase.from("transactions").update(updatePayload).eq("id", transaction_id);
  if (error) throw new Error(error.message);

  // balance is derived via pocket_balances view, no manual recalculation needed
  await supabase.from("telegram_pending_confirmations").update({ status: "confirmed" }).eq("id", pendingId);
}
