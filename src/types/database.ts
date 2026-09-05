/**
 * Canonical domain types — mirrors supabase/migrations/001_initial_schema.sql
 * Keep in sync with DB. Strict TypeScript, no any.
 * These types are hand-maintained until `supabase gen types` is adopted.
 */

// ---------------------------------------------------------------------------
// Enums (match DB enums)
// ---------------------------------------------------------------------------
export type UserRole = "admin" | "bendahara" | "viewer";
export type CategoryType = "income" | "expense" | "both";
export type TransactionType = "income" | "expense";
export type TransactionSource = "web" | "telegram" | "whatsapp" | "import";

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------
export interface RtProfile {
  id: string;
  name: string;
  rt_number: string;
  rw_number: string;
  address: string | null;
  kelurahan: string | null;
  kecamatan: string | null;
  city: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string; // FK auth.users.id
  rt_id: string;
  name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Pocket {
  id: string;
  rt_id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  opening_balance: string; // NUMERIC(15,2) saldo awal
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  rt_id: string;
  name: string;
  type: CategoryType;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  rt_id: string;
  pocket_id: string;
  category_id: string | null;
  type: TransactionType;
  /** NUMERIC(15,2) mapped as string from Supabase; domain may use number for convenience */
  amount: string;
  description: string | null;
  transaction_date: string; // date (YYYY-MM-DD)
  source: TransactionSource;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Transfer {
  id: string;
  rt_id: string;
  from_pocket_id: string;
  to_pocket_id: string;
  amount: string; // NUMERIC(15,2)
  description: string | null;
  transaction_date: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionAttachment {
  id: string;
  transaction_id: string;
  file_url: string;
  file_type: string | null;
  created_at: string;
}

export type AiProviderId = "openrouter" | "openai" | "anthropic" | "mock";

export interface RtAiSettings {
  id: string;
  rt_id: string;
  provider: AiProviderId;
  model: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export type MonthlyReportStatus = "OPEN" | "GENERATING" | "READY" | "CLOSED" | "REOPENED" | "FAILED";

export interface MonthlyReport {
  id: string;
  rt_id: string;
  year: number;
  month: number;
  period_start: string;
  period_end: string;
  status: MonthlyReportStatus;
  opening_balance: string;
  total_income: string;
  total_expense: string;
  total_transfer_in: string;
  total_transfer_out: string;
  closing_balance: string;
  transaction_count: number;
  pdf_url: string | null;
  excel_url: string | null;
  generated_at: string | null;
  generated_by: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface MonthlyReportPocket {
  id: string;
  monthly_report_id: string;
  pocket_id: string;
  pocket_name: string;
  opening_balance: string;
  total_income: string;
  total_expense: string;
  total_transfer_in: string;
  total_transfer_out: string;
  closing_balance: string;
  transaction_count: number;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Views / derived
// ---------------------------------------------------------------------------
export interface PocketBalance extends Pocket {
  balance: string; // NUMERIC from view, string to preserve precision
}

export interface PocketBalanceNumeric extends Pocket {
  balance: number;
}

// ---------------------------------------------------------------------------
// Helper ID aliases (ergonomic)
// ---------------------------------------------------------------------------
export type RtId = string;
export type PocketId = string;
export type TransactionId = string;
export type TransferId = string;
export type CategoryId = string;

// ---------------------------------------------------------------------------
// AI parser output — never persisted without server validation
// ---------------------------------------------------------------------------
export interface AiParsedTransaction {
  type: TransactionType | "transfer";
  amount: number;
  pocket?: string;
  from_pocket?: string;
  to_pocket?: string;
  category?: string;
  description?: string;
  confidence: number;
  raw_input: string;
}
