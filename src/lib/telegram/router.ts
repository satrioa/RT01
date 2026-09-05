/**
 * Intent router — separates webhook plumbing from business logic.
 */
import { createPending, getActiveEditPending, setPendingStatus } from "./pending";
import { handleDeterministic } from "@/lib/ai/deterministic";
import {
  sendMessage,
  sendMessageWithConfirmation,
  formatTransactionConfirmation,
  formatTransferConfirmation,
} from "./client";
import { getSaldoForPocket, getTransaksiSummary } from "./service";
import type { TelegramAccount } from "./types";
import { handleEditInput } from "./edit";
import { buildReportTypeKeyboard } from "./report";

export async function routeMessage(
  chatId: number,
  telegramUserId: number,
  telegramUsername: string | undefined,
  text: string,
  account: TelegramAccount | null
): Promise<void> {
  const trimmed = text.trim();

  // Not linked -> guide to /link
  if (!account) {
    if (trimmed.startsWith("/link")) {
      const code = trimmed.split(/\s+/)[1];
      if (!code) {
        await sendMessage(chatId, "Format: /link KODE\nBuat kode di web app: Pengaturan → Hubungkan Telegram");
        return;
      }
      const { linkByCode } = await import("./auth");
      const res = await linkByCode(telegramUserId, telegramUsername, chatId, code);
      await sendMessage(chatId, res.message);
      return;
    }
    if (trimmed.startsWith("/start") || trimmed.startsWith("/help")) {
      await sendMessage(
        chatId,
        [
          "Halo! Saya bot RT Finance.",
          "",
          "Hubungkan akun dulu:",
          "1. Buka web app → Pengaturan → Telegram → Buat Kode",
          "2. Kirim di sini: /link KODE",
          "",
          "Setelah terhubung, kirim transaksi natural language, contoh: 'Beli konsumsi 75 ribu dari kas'",
        ].join("\n")
      );
      return;
    }
    await sendMessage(chatId, "Akun belum terhubung. Kirim /link KODE untuk menghubungkan. Buat kode di web app → Pengaturan → Telegram.");
    return;
  }

  const rtId = account.rt_id;

  // --- Edit transaksi: if user has active edit session, treat next text as field input ---
  // Check pending edit before any other handling (except /cancel)
  const activeEdit = await getActiveEditPending(telegramUserId, chatId);
  if (activeEdit) {
    if (trimmed.toLowerCase() === "/cancel") {
      await setPendingStatus(activeEdit.id, "cancelled");
      await sendMessage(chatId, "Edit dibatalkan.");
      return;
    }
    // If message is a slash command, cancel edit and continue to command handling
    if (trimmed.startsWith("/")) {
      // let command handling below; but keep edit pending? we cancel it
      await setPendingStatus(activeEdit.id, "cancelled");
      // proceed to command handling below
    } else {
      const handled = await handleEditInput(chatId, telegramUserId, trimmed, rtId);
      if (handled) return;
    }
  }

  // Commands
  if (trimmed === "/start") {
    await sendMessage(
      chatId,
      [
        `Halo ${account.telegram_username ?? ""}! Akun terhubung ke RT ${rtId.slice(0, 8)}.`,
        "",
        "Perintah:",
        "/help — bantuan",
        "/saldo [kantong] — cek saldo",
        "/transaksi — 5 transaksi terbaru",
        "/laporan — ringkasan bulan ini",
        "",
        "Atau kirim natural language:",
        "• Beli konsumsi kerja bakti 75 ribu dari kas",
        "• Iuran warga 1 juta masuk kas",
        "• Pindahkan 500 ribu dari kas ke BOP",
      ].join("\n")
    );
    return;
  }

  if (trimmed === "/help") {
    await sendMessage(
      chatId,
      [
        "/start — sapaan & status link",
        "/saldo [kantong] — cek saldo kantong / total",
        "/saldo kas — saldo Kas",
        "/transaksi — 5 transaksi terbaru",
        "/laporan — pemasukan/pengeluaran bulan ini",
        "/unlink — putuskan hubungan",
        "",
        "Natural language juga didukung via AI parser, tapiSaldo/transaksi/laporan tidak pakai AI (hemat biaya).",
      ].join("\n")
    );
    return;
  }

  if (trimmed === "/unlink") {
    const { unlinkAccount } = await import("./auth");
    await unlinkAccount(telegramUserId);
    await sendMessage(chatId, "Akun Telegram diputuskan. Kirim /link KODE untuk hubungkan lagi.");
    return;
  }

  // Deterministic commands — no AI
  if (trimmed.startsWith("/saldo")) {
    const pocketQuery = trimmed.replace(/^\/saldo\s*/i, "").trim() || undefined;
    const ans = await getSaldoForPocket(rtId, pocketQuery || undefined);
    await sendMessage(chatId, ans);
    return;
  }

  if (trimmed.startsWith("/transaksi")) {
    const summary = await getTransaksiSummary(rtId, 5);
    const hasTx = summary !== "Belum ada transaksi.";
    const replyMarkup = hasTx
      ? { inline_keyboard: [[{ text: "✏️ Edit Transaksi", callback_data: "rt:tx:edit:menu" }]] }
      : undefined;
    await sendMessage(chatId, summary, replyMarkup ? { replyMarkup } : undefined);
    return;
  }

  if (trimmed.startsWith("/laporan")) {
    await sendMessage(chatId, ["📊 Laporan RTFinance", "", "Pilih jenis laporan:"].join("\n"), {
      replyMarkup: buildReportTypeKeyboard(),
    });
    return;
  }

  // Also handle bare "saldo kas" etc without slash — deterministic
  if (/^(?:cek\s+)?saldo\b/i.test(trimmed) || /^transaksi\s+(bulan|hari)\s+ini$/i.test(trimmed)) {
    // Reuse deterministic for saldo etc but with correct rtId via service directly
    const saldoMatch = trimmed.match(/^(?:cek\s+)?saldo\s+([a-z0-9\s&]+?)(?:\s+berapa)?$/i);
    if (saldoMatch) {
      const pocketQ = saldoMatch[1].trim() || undefined;
      const ans = await getSaldoForPocket(rtId, pocketQ);
      await sendMessage(chatId, ans);
      return;
    }
    if (/^(?:cek\s+)?saldo(?:\s+rt)?(?:\s+total)?$/i.test(trimmed)) {
      const ans = await getSaldoForPocket(rtId, undefined);
      await sendMessage(chatId, ans);
      return;
    }
  }

  // Natural language → AI parser (or mock) — reuse deterministic check first (cost opt)
  const det = await handleDeterministic(trimmed);
  if (det.handled) {
    // handleDeterministic used DEV_RT_ID, but we prefer rt-aware answer via getSaldoForPocket for saldo-like handled
    // If deterministic handled via saldo, we already handled above; otherwise show generic
    await sendMessage(chatId, det.answer);
    return;
  }

  const parsed = await parseForRt(trimmed, rtId);

  if (parsed.type === "needs_confirmation") {
    const q = parsed.data.questions.join("\n");
    const opts = parsed.data.options ? `\nOpsi: ${parsed.data.options.join(", ")}` : "";
    await sendMessage(chatId, `${q}${opts}`);
    return;
  }

  if (parsed.type === "error") {
    await sendMessage(chatId, `Tidak paham: ${parsed.error}\nCoba: "Beli konsumsi 75 ribu dari Kas"`);
    return;
  }

  if (parsed.type === "transaction") {
    const d = parsed.data;
    const text = formatTransactionConfirmation(d.type as "income" | "expense", d.amount, d.pocket, d.category, d.description ?? null);
    const pendingId = await createPending(telegramUserId, chatId, rtId, "create_transaction", {
      intent: "create_transaction",
      type: d.type as "income" | "expense",
      amount: d.amount,
      pocket: d.pocket,
      pocketId: d.pocketId,
      category: d.category ?? null,
      categoryId: d.categoryId ?? null,
      description: d.description ?? null,
      transaction_date: d.transaction_date ?? null,
    });
    await sendMessageWithConfirmation(chatId, text, pendingId);
    return;
  }

  if (parsed.type === "transfer") {
    const d = parsed.data;
    const text = formatTransferConfirmation(d.amount, d.from_pocket, d.to_pocket, d.description ?? null);
    const pendingId = await createPending(telegramUserId, chatId, rtId, "create_transfer", {
      intent: "create_transfer",
      amount: d.amount,
      from_pocket: d.from_pocket,
      to_pocket: d.to_pocket,
      fromPocketId: d.fromPocketId,
      toPocketId: d.toPocketId,
      description: d.description ?? null,
      transaction_date: d.transaction_date ?? null,
    });
    await sendMessageWithConfirmation(chatId, text, pendingId);
    return;
  }

  await sendMessage(chatId, "Belum bisa diproses. Coba lagi dengan format lebih jelas.");
}

// Helper: rt-aware parse (mirrors parseSmartInput but with rtId)
async function parseForRt(trimmed: string, rtId: string) {
  // Duplicate minimal logic from parser.ts but rt-aware context
  const { createServiceClient } = await import("@/lib/supabase/service");
  const supabase = createServiceClient();
  const [pRes, cRes] = await Promise.all([
    supabase.from("pockets").select("name").eq("rt_id", rtId).eq("is_active", true),
    supabase.from("categories").select("name, type").eq("rt_id", rtId).eq("is_active", true),
  ]);
  const pockets = ((pRes.data as { name: string }[] | null) ?? []).map((p) => p.name);
  const categories = ((cRes.data as { name: string; type: "income" | "expense" | "both" }[] | null) ?? []).map((c) => ({
    name: c.name,
    type: c.type as "income" | "expense" | "both",
  }));
  const ctx = {
    pockets: pockets.length ? pockets : ["Kas", "BOP", "Sosial", "Kegiatan"],
    categories: categories.length ? categories : [{ name: "Iuran Warga", type: "income" as const }, { name: "Konsumsi", type: "expense" as const }],
    currentDate: new Date().toISOString().slice(0, 10),
  };

  const apiKey = process.env.OPENROUTER_API_KEY;
  const { OpenRouterProvider } = await import("@/lib/ai/openrouter");
  const { MockProvider } = await import("@/lib/ai/mock");
  const provider = apiKey ? new OpenRouterProvider(apiKey) : new MockProvider();

  let raw;
  try {
    raw = await provider.parse(trimmed, ctx);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal parse AI";
    const isAuthError =
      msg.includes("401") ||
      msg.includes("404") ||
      msg.toLowerCase().includes("user not found") ||
      msg.toLowerCase().includes("unauthorized") ||
      msg.toLowerCase().includes("is no longer available") ||
      msg.toLowerCase().includes("not_found") ||
      msg.toLowerCase().includes("model");
    if (isAuthError) {
      try {
        const fallback = new MockProvider();
        raw = await fallback.parse(trimmed, ctx);
      } catch {
        return { type: "error" as const, error: msg };
      }
    } else {
      return { type: "error" as const, error: msg };
    }
  }

  // Reuse same validation as parser.ts — simplified
  const { aiTransactionOutputSchema, aiTransferOutputSchema, aiNeedsConfirmationSchema } = await import("@/lib/ai/types");

  if (raw.intent === "needs_confirmation") {
    const parsed = aiNeedsConfirmationSchema.safeParse(raw);
    if (!parsed.success) return { type: "error" as const, error: "Format needs_confirmation tidak valid." };
    const data = parsed.data;
    const asksPocket = data.questions.join(" ").toLowerCase().includes("kantong");
    if (asksPocket && (!data.options || data.options.length === 0)) data.options = ctx.pockets;
    return { type: "needs_confirmation" as const, data };
  }
  if (raw.intent === "create_transaction") {
    const parsed = aiTransactionOutputSchema.safeParse(raw);
    if (!parsed.success) return { type: "error" as const, error: parsed.error.issues.map((i) => i.message).join("; ") };
    const pocketKnown = ctx.pockets.some((p) => p.toLowerCase() === parsed.data.pocket.toLowerCase());
    if (!pocketKnown) {
      return {
        type: "needs_confirmation" as const,
        data: {
          intent: "needs_confirmation" as const,
          needs_confirmation: true as const,
          questions: [`Kantong "${parsed.data.pocket}" tidak ditemukan. Pilih:`],
          options: ctx.pockets,
          partial: { ...parsed.data },
          confidence: 0.5,
        },
      };
    }
    // resolve IDs
    const [pAll, cAll] = await Promise.all([
      supabase.from("pockets").select("id, name").eq("rt_id", rtId),
      supabase.from("categories").select("id, name").eq("rt_id", rtId),
    ]);
    const pocketsList = (pAll.data as { id: string; name: string }[] | null) ?? [];
    const categoriesList = (cAll.data as { id: string; name: string }[] | null) ?? [];
    const pocketId = pocketsList.find((p) => p.name.toLowerCase() === parsed.data.pocket.toLowerCase())?.id;
    let catName = parsed.data.category ?? null;
    if (catName) {
      const knownCat = ctx.categories.some((c) => c.name.toLowerCase() === catName!.toLowerCase());
      if (!knownCat) catName = null;
    }
    const categoryId = catName ? categoriesList.find((c) => c.name.toLowerCase() === catName!.toLowerCase())?.id ?? null : null;
    return { type: "transaction" as const, data: { ...parsed.data, category: catName, pocketId, categoryId } };
  }
  if (raw.intent === "create_transfer") {
    const parsed = aiTransferOutputSchema.safeParse(raw);
    if (!parsed.success) return { type: "error" as const, error: parsed.error.issues.map((i) => i.message).join("; ") };
    const pLow = ctx.pockets.map((p) => p.toLowerCase());
    const fromKnown = pLow.includes(parsed.data.from_pocket.toLowerCase());
    const toKnown = pLow.includes(parsed.data.to_pocket.toLowerCase());
    if (!fromKnown || !toKnown) {
      return {
        type: "needs_confirmation" as const,
        data: {
          intent: "needs_confirmation" as const,
          needs_confirmation: true as const,
          questions: ["Kantong transfer tidak dikenali. Pilih:"],
          options: ctx.pockets,
          partial: { ...parsed.data },
          confidence: 0.5,
        },
      };
    }
    if (parsed.data.from_pocket.toLowerCase() === parsed.data.to_pocket.toLowerCase()) {
      return { type: "error" as const, error: "Kantong asal dan tujuan harus berbeda." };
    }
    const { data: pocketsAll } = await supabase.from("pockets").select("id, name").eq("rt_id", rtId);
    const list = (pocketsAll as { id: string; name: string }[] | null) ?? [];
    const fromPocketId = list.find((p) => p.name.toLowerCase() === parsed.data.from_pocket.toLowerCase())?.id;
    const toPocketId = list.find((p) => p.name.toLowerCase() === parsed.data.to_pocket.toLowerCase())?.id;
    return { type: "transfer" as const, data: { ...parsed.data, fromPocketId, toPocketId } };
  }
  return { type: "error" as const, error: "Tidak paham." };
}
