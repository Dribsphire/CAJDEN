-- =========================================================
-- Migration: photo albums can be hidden from the public site.
-- Optional: api/albums.php adds this column automatically.
-- =========================================================
ALTER TABLE photo_albums ADD COLUMN is_published TINYINT(1) NOT NULL DEFAULT 1 AFTER is_featured;
