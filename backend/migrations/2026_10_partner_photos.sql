-- =========================================================
-- Migration: photo for each partner FBPO (shown on the About
-- page org chart). Optional: api/partners.php also adds this
-- column automatically the first time an FBPO is saved.
-- =========================================================
ALTER TABLE partner_organizations ADD COLUMN photo_path VARCHAR(255) DEFAULT NULL AFTER org_name;
