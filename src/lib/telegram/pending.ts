import { createServerClient } from "@/lib/supabase/server";

export interface PendingPayload {
  intent: "create_transaction" | "create_transfer";
  amount: number;
  // transaction
  type?: "income" | "expense";
  pocket?: string;
  pocketId?: string;
  category?: string | null;
  categoryId?: string | null;
  // transfer
  from_pocket?: string;
  to_pocket?: string;
  fromPocketId?: string;
  toPocketId?: string;
  description?: string | null;
  transaction_date?: string | null;
}

export async function createPending(
  telegramUserId: number,
  chatId: number,
  rtId: string,
  intentType: "create_transaction" | "create_transfer",
  payload: PendingPayload
): Promise<string> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("telegram_pending_confirmations")
    .insert({
      telegram_user_id: telegramUserId,
      chat_id: chatId,
      rt_id: rtId,
      intent_type: intentType,
      payload,
      status: "pending",
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Gagal buat pending");
  return (data as { id: string }).id;
}

export async function getPending(id: string): Promise<null | {
  id: string;
  telegram_user_id: number;
  chat_id: number;
  rt_id: string;
  intent_type: string;
  payload: PendingPayload;
  status: string;
}> {
  const supabase = createServerClient();
  const { data } = await supabase.from("telegram_pending_confirmations").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  return data as unknown as {
    id: string;
    telegram_user_id: number;
    chat_id: number;
    rt_id: string;
    intent_type: string;
    payload: PendingPayload;
    status: string;
  };
}

export async function setPendingStatus(id: string, status: "confirmed" | "cancelled"): Promise<void> {
  const supabase = createServerClient();
  await supabase.from("telegram_pending_confirmations").update({ status }).eq("id", id);
}
