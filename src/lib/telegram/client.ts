const TELEGRAM_API = "https://api.telegram.org";

function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN belum dikonfigurasi");
  return token;
}

export async function sendMessage(
  chatId: number,
  text: string,
  opts?: { parseMode?: "Markdown" | "HTML"; replyMarkup?: unknown }
): Promise<void> {
  const token = getBotToken();
  const url = `${TELEGRAM_API}/bot${token}/sendMessage`;
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: opts?.parseMode,
  };
  if (opts?.replyMarkup) body.reply_markup = opts.replyMarkup;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    console.error("[telegram] sendMessage failed", res.status, t.slice(0, 500));
  }
}

export async function sendMessageWithConfirmation(
  chatId: number,
  text: string,
  pendingId: string
): Promise<void> {
  const replyMarkup = {
    inline_keyboard: [
      [
        { text: "✅ Simpan", callback_data: `confirm:${pendingId}` },
        { text: "❌ Batal", callback_data: `cancel:${pendingId}` },
      ],
    ],
  };
  await sendMessage(chatId, text, { replyMarkup });
}

export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string,
  showAlert?: boolean
): Promise<void> {
  const token = getBotToken();
  const url = `${TELEGRAM_API}/bot${token}/answerCallbackQuery`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
      show_alert: showAlert ?? false,
    }),
  }).catch(() => {});
}

export async function editMessageText(
  chatId: number,
  messageId: number,
  text: string,
  replyMarkup?: unknown
): Promise<void> {
  const token = getBotToken();
  const url = `${TELEGRAM_API}/bot${token}/editMessageText`;
  const body: Record<string, unknown> = { chat_id: chatId, message_id: messageId, text };
  if (replyMarkup) body.reply_markup = replyMarkup;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => {});
}

export async function editMessageReplyMarkup(
  chatId: number,
  messageId: number,
  replyMarkup: unknown
): Promise<void> {
  const token = getBotToken();
  const url = `${TELEGRAM_API}/bot${token}/editMessageReplyMarkup`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, reply_markup: replyMarkup }),
  }).catch(() => {});
}

export async function sendDocument(
  chatId: number,
  fileBuffer: Buffer,
  filename: string,
  caption?: string
): Promise<void> {
  const token = getBotToken();
  const url = `${TELEGRAM_API}/bot${token}/sendDocument`;
  const form = new FormData();
  form.append("chat_id", String(chatId));
  // Node 18+ FormData with Blob
  const blob = new Blob([new Uint8Array(fileBuffer)], { type: "application/pdf" } as BlobPropertyBag);
  form.append("document", blob, filename);
  if (caption) form.append("caption", caption);
  const res = await fetch(url, { method: "POST", body: form as unknown as BodyInit });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    console.error("[telegram] sendDocument failed", res.status, t.slice(0, 800));
    throw new Error(`Gagal kirim dokumen: ${res.status} ${t.slice(0, 200)}`);
  }
}

export function formatTransactionConfirmation(
  type: "income" | "expense",
  amount: number,
  pocket: string,
  category: string | null | undefined,
  description: string | null | undefined
): string {
  const title = type === "income" ? "Pemasukan" : "Pengeluaran";
  const amt = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
  return [
    "Saya menemukan transaksi:",
    "",
    title,
    amt,
    "",
    `Kantong: ${pocket}`,
    `Kategori: ${category ?? "—"}`,
    "",
    `Keterangan:`,
    description ?? "—",
  ].join("\n");
}

export function formatTransferConfirmation(
  amount: number,
  from: string,
  to: string,
  description: string | null | undefined
): string {
  const amt = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
  return [
    "Saya menemukan transfer:",
    "",
    `Pindah Kantong`,
    amt,
    "",
    `Dari: ${from}`,
    `Ke: ${to}`,
    "",
    `Catatan:`,
    description ?? "—",
  ].join("\n");
}
