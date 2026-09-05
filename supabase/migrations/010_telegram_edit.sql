-- Telegram edit transaksi: allow update_transaction in pending
ALTER TABLE telegram_pending_confirmations DROP CONSTRAINT IF EXISTS telegram_pending_confirmations_intent_type_check;
ALTER TABLE telegram_pending_confirmations ADD CONSTRAINT telegram_pending_confirmations_intent_type_check CHECK (intent_type IN ('create_transaction','create_transfer','update_transaction'));
