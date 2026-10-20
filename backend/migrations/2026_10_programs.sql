-- =========================================================
-- Migration: programs (services) get a homepage summary,
-- a display order, and a published/hidden switch.
-- Optional: api/services.php adds these columns automatically.
-- =========================================================
ALTER TABLE services
  ADD COLUMN summary VARCHAR(300) DEFAULT NULL AFTER title,
  ADD COLUMN sort_order INT NOT NULL DEFAULT 0,
  ADD COLUMN is_published TINYINT(1) NOT NULL DEFAULT 1;
