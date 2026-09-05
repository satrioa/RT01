import { createServiceClient } from "@/lib/supabase/service";

export interface PendingPayload {
  intent: "create_transaction" | "create_transfer" | "update_transaction";
  amount?: number;
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
  // update
  transaction_id?: string;
  field?: "amount" | "description" | "category" | "date" | "account";
  old_value?: string | null;
}

export async function createPending(
  telegramUserId: number,
  chatId: number,
  rtId: string,
  intentType: "create_transaction" | "create_transfer" | "update_transaction",
  payload: PendingPayload
): Promise<string> {
  const supabase = createServiceClient();
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
  const supabase = createServiceClient();
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

export async function setPendingStatus(id: string, status: "confirmed" | "cancelled" | "expired"): Promise<void> {
  const supabase = createServiceClient();
  await supabase.from("telegram_pending_confirmations").update({ status }).eq("id", id);
}

export async function getActiveEditPending(
  telegramUserId: number,
  chatId: number
): Promise<null | {
  id: string;
  rt_id: string;
  payload: PendingPayload;
  status: string;
}> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("telegram_pending_confirmations")
    .select("id, rt_id, payload, status")
    .eq("telegram_user_id", telegramUserId)
    .eq("chat_id", chatId)
    .eq("intent_type", "update_transaction")
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return data as unknown as { id: string; rt_id: string; payload: PendingPayload; status: string };
}

export async function findPendingById(id: string) {
  return getPending(id);
}
