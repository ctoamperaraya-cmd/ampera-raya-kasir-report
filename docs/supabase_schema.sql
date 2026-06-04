-- ================================================================
-- AMPERA KASIR — Supabase Schema
-- Jalankan dalam Supabase SQL Editor (sekali sahaja)
-- ================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────
-- TABLE: users
-- Kasir, admin, dan superadmin yang didaftarkan
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- untuk admin login dashboard
  name          TEXT NOT NULL,
  telegram_id   TEXT UNIQUE,                -- Telegram User ID (kasir)
  branch_code   TEXT NOT NULL,              -- KW, KJ, S13, S7, KLTS, KD, TTDI
  role          TEXT NOT NULL DEFAULT 'cashier'
                  CHECK (role IN ('cashier','manager','admin','superadmin')),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────
-- TABLE: reports
-- Laporan harian kasir setiap cabang
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cashier_id            UUID REFERENCES users(id) ON DELETE SET NULL,
  branch_code           TEXT NOT NULL,
  report_date           DATE NOT NULL,
  day_name              TEXT,

  -- Cash Income
  denom_qty             JSONB NOT NULL DEFAULT '{}',  -- {rm100:4, rm50:10, ...}
  total_cash_a          NUMERIC(12,2) DEFAULT 0,
  float_hari_ini        NUMERIC(12,2) DEFAULT 0,
  net_cash_aa           NUMERIC(12,2) DEFAULT 0,

  -- QR & Transfer
  bank_in               NUMERIC(12,2) DEFAULT 0,
  qr_amount             NUMERIC(12,2) DEFAULT 0,
  total_transfer_qr_b   NUMERIC(12,2) DEFAULT 0,

  -- Debit / Credit
  visa                  NUMERIC(12,2) DEFAULT 0,
  mastercard            NUMERIC(12,2) DEFAULT 0,
  mydebit               NUMERIC(12,2) DEFAULT 0,
  amex                  NUMERIC(12,2) DEFAULT 0,
  debit_credit_total_d  NUMERIC(12,2) DEFAULT 0,

  -- Other Income (Platform)
  grab_food             NUMERIC(12,2) DEFAULT 0,
  panda_food            NUMERIC(12,2) DEFAULT 0,
  shopee_food           NUMERIC(12,2) DEFAULT 0,
  total_other_income_c  NUMERIC(12,2) DEFAULT 0,

  -- Pengeluaran (dynamic)
  expenses              JSONB NOT NULL DEFAULT '[]', -- [{detail, note, amount}]
  total_expenses_e      NUMERIC(12,2) DEFAULT 0,

  -- Hubbo (manual input dari sistem POS)
  hubbo_net_cash        NUMERIC(12,2) DEFAULT 0,
  hubbo_pengeluaran     NUMERIC(12,2) DEFAULT 0,
  hubbo_qr_transfer     NUMERIC(12,2) DEFAULT 0,
  hubbo_debit_credit    NUMERIC(12,2) DEFAULT 0,
  hubbo_total_income_all NUMERIC(12,2) DEFAULT 0,

  -- Summary (computed)
  cash_sales_actual     NUMERIC(12,2) DEFAULT 0,
  total_income_actual   NUMERIC(12,2) DEFAULT 0,
  grand_total           NUMERIC(12,2) DEFAULT 0,
  float_cash_esok       NUMERIC(12,2) DEFAULT 0,

  -- Diff
  diff_net_cash         NUMERIC(12,2) DEFAULT 0,
  diff_pengeluaran      NUMERIC(12,2) DEFAULT 0,
  diff_cash_sales       NUMERIC(12,2) DEFAULT 0,
  diff_qr               NUMERIC(12,2) DEFAULT 0,
  diff_dc               NUMERIC(12,2) DEFAULT 0,
  diff_total_income     NUMERIC(12,2) DEFAULT 0,
  diff_total_all        NUMERIC(12,2) DEFAULT 0,

  -- PDF
  pdf_url               TEXT,

  -- Status & audit
  status                TEXT NOT NULL DEFAULT 'submitted'
                          CHECK (status IN ('draft','submitted','unlocked')),
  submitted_at          TIMESTAMPTZ,
  edited_at             TIMESTAMPTZ,
  unlock_reason         TEXT,
  unlocked_by           UUID REFERENCES users(id) ON DELETE SET NULL,
  unlocked_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint: 1 laporan per cabang per hari
  CONSTRAINT unique_branch_date UNIQUE (branch_code, report_date)
);

-- ─────────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_reports_branch     ON reports(branch_code);
CREATE INDEX IF NOT EXISTS idx_reports_date       ON reports(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_reports_status     ON reports(status);
CREATE INDEX IF NOT EXISTS idx_users_telegram     ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_branch       ON users(branch_code);

-- ─────────────────────────────────────────────────────────────────
-- UPDATED_AT trigger untuk table users
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE users   ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Backend (service role) bypass semua RLS — tidak perlu policy tambahan
-- Dashboard admin guna service role via backend, bukan direct Supabase client

-- Policy untuk anon (miniapp preview tanpa login — disabled by default)
-- Uncomment kalau nak allow direct Supabase query dari miniapp:
-- CREATE POLICY "Kasir baca laporan sendiri" ON reports
--   FOR SELECT USING (auth.uid() IN (
--     SELECT auth_id FROM users WHERE id = cashier_id
--   ));

-- ─────────────────────────────────────────────────────────────────
-- SUPABASE STORAGE — bucket untuk PDF
-- Jalankan dalam SQL Editor ATAU buat manual dalam Storage UI
-- ─────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('kasir-reports', 'kasir-reports', true)
ON CONFLICT DO NOTHING;

-- Allow service role upload
CREATE POLICY "Service role boleh upload PDF"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'kasir-reports');

CREATE POLICY "PDF boleh dibaca semua (public)"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'kasir-reports');

-- ─────────────────────────────────────────────────────────────────
-- SEED: Admin pertama (ganti email & nama)
-- Buat dulu dalam Supabase Auth > Users, dapat UUID, paste sini
-- ─────────────────────────────────────────────────────────────────
-- INSERT INTO users (auth_id, name, telegram_id, branch_code, role)
-- VALUES (
--   'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',  -- UUID dari Supabase Auth
--   'Admin Ampera',
--   NULL,
--   'HQ',
--   'superadmin'
-- );
