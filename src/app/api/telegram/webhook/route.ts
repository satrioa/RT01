import { NextRequest, NextResponse } from "next/server";
import type { TelegramUpdate } from "@/lib/telegram/types";
import { getLinkedAccount } from "@/lib/telegram/auth";
import { routeMessage } from "@/lib/telegram/router";
import { handleCallback } from "@/lib/telegram/callback";

export const dynamic = "force-dynamic";

// Verify webhook secret if configured
function verifySecret(req: NextRequest): boolean {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) return true; // no secret configured -> allow (dev)
  const incoming = req.headers.get("x-telegram-bot-api-secret-token") ?? req.headers.get("X-Telegram-Bot-Api-Secret-Token");
  return incoming === secret;
}

export async function POST(req: NextRequest) {
  if (!verifySecret(req)) {
    return NextResponse.json({ ok: false, error: "invalid secret" }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = (await req.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  // Do not await business logic to return quickly (Telegram expects 200 within 5s)
  // But we still await to ensure errors are logged; use waitUntil pattern via promise
  try {
    if (update.callback_query) {
      const cq = update.callback_query;
      const chatId = cq.message?.chat.id ?? cq.from.id;
      const messageId = cq.message?.message_id;
      // Business logic separated from webhook handler — delegate to callback service
      await handleCallback(cq.id, cq.from.id, chatId, messageId, cq.data);
    } else if (update.message?.text) {
      const msg = update.message;
      const text = msg.text ?? "";
      const chatId = msg.chat.id;
      const userId = msg.from?.id;
      if (!userId) {
        return NextResponse.json({ ok: true });
      }
      const account = await getLinkedAccount(userId);
      // Route via intent router (deterministic OR AI) — separated from webhook plumbing
      await routeMessage(chatId, userId, msg.from?.username, text, account);
    }
  } catch (e) {
    console.error("[telegram webhook] error", e);
    // Do not expose internal error to Telegram, still return 200
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, message: "Telegram webhook endpoint. POST updates here." });
}
