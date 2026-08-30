-- ─────────────────────────────────────────────────────────────────
-- MIGRATION: Benarkan >1 laporan per cabang per hari
-- Jalankan ini SEKALI di Supabase SQL Editor (project production)
-- ─────────────────────────────────────────────────────────────────

-- 1. Buang constraint unik lama (1 laporan per cabang per hari)
ALTER TABLE reports DROP CONSTRAINT IF EXISTS unique_branch_date;

-- 2. Tambah index biasa (bukan unique) untuk kekalkan performance
--    query yang filter/order ikut branch_code + report_date
CREATE INDEX IF NOT EXISTS idx_reports_branch_date
  ON reports(branch_code, report_date);

-- Sahkan constraint sudah hilang:
-- SELECT conname FROM pg_constraint
-- WHERE conrelid = 'reports'::regclass AND contype = 'u';
-- (sepatutnya tiada row 'unique_branch_date' lagi)
