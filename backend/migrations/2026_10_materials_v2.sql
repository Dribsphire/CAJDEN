-- =========================================================
-- Migration: materials can be links instead of files, have a
-- cover image, count downloads, and be hidden (draft).
-- Optional: api/materials.php applies these automatically.
-- =========================================================
ALTER TABLE materials
  MODIFY file_path VARCHAR(255) DEFAULT NULL,
  ADD COLUMN external_url VARCHAR(500) DEFAULT NULL AFTER file_size,
  ADD COLUMN cover_image VARCHAR(255) DEFAULT NULL AFTER external_url,
  ADD COLUMN download_count INT NOT NULL DEFAULT 0 AFTER cover_image,
  ADD COLUMN is_published TINYINT(1) NOT NULL DEFAULT 1 AFTER is_featured;
