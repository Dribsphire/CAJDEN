-- =========================================================
-- Migration: E-News issues can be saved as drafts.
-- Optional: api/enews.php adds this column automatically.
-- =========================================================
ALTER TABLE enews_issues ADD COLUMN is_published TINYINT(1) NOT NULL DEFAULT 1 AFTER file_size;
