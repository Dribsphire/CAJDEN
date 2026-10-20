-- =========================================================
-- Migration: Resources section (Photos, E-News, Materials)
-- Run once against an existing database (local or production)
-- via phpMyAdmin > SQL. Fresh installs get these tables from
-- schema.sql instead.
-- =========================================================

-- ---------------------------------------------------------
-- PHOTO ALBUMS + their photos (Resources > Photos)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS photo_albums (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  category VARCHAR(100) DEFAULT NULL,              -- e.g. Youth, Livelihood, Parish
  description TEXT DEFAULT NULL,
  event_date DATE DEFAULT NULL,                    -- when the activity happened
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,      -- shown large at the top of the Photos page
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS album_photos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  album_id INT NOT NULL,
  image_path VARCHAR(255) NOT NULL,
  caption VARCHAR(255) DEFAULT NULL,
  sort_order INT NOT NULL DEFAULT 0,               -- first photo is the album cover
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (album_id) REFERENCES photo_albums(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- E-NEWS ISSUES (Resources > E-News) + newsletter subscribers
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS enews_issues (
  id INT AUTO_INCREMENT PRIMARY KEY,
  issue_number INT NOT NULL,
  title VARCHAR(200) NOT NULL,                     -- cover story headline
  period_label VARCHAR(50) DEFAULT NULL,           -- e.g. "Q1 2026" or "March 2026"
  published_on DATE DEFAULT NULL,
  summary TEXT DEFAULT NULL,
  highlights TEXT DEFAULT NULL,                    -- one "in this issue" line per row
  cover_image VARCHAR(255) DEFAULT NULL,
  pdf_path VARCHAR(255) DEFAULT NULL,
  file_size INT DEFAULT NULL,                      -- bytes, for the "PDF · 4.2 MB" label
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS enews_subscribers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(150) NOT NULL UNIQUE,
  subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- MATERIALS (Resources > Materials): modules, reports, IEC posters, policies
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS materials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  type ENUM('module','report','poster','policy','other') NOT NULL DEFAULT 'module',
  description TEXT DEFAULT NULL,
  language VARCHAR(100) DEFAULT NULL,              -- e.g. "English, Hiligaynon"
  year SMALLINT DEFAULT NULL,
  file_path VARCHAR(255) NOT NULL,
  file_size INT DEFAULT NULL,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL,
  FULLTEXT KEY ft_materials (title, description)
) ENGINE=InnoDB;
