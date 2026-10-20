-- =========================================================
-- NGO Website Management System — Database Schema (MySQL)
-- =========================================================
CREATE DATABASE IF NOT EXISTS ngo_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ngo_db;

-- ---------------------------------------------------------
-- ADMINS
-- ---------------------------------------------------------
CREATE TABLE admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- OFFICERS (organization hierarchy)
-- rank_level:
--   1 = Board of Trustees member (Chair, Treasurer, Secretary, Members)
--   2 = Executive Director
--   3 = Department staff (requires `department`)
-- ---------------------------------------------------------
CREATE TABLE officers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  position_title VARCHAR(100) NOT NULL,          -- e.g. Board Chair, Finance Officer, Youth Coordinator...
  rank_level INT NOT NULL DEFAULT 3,             -- 1=Board Member, 2=Executive Director, 3=Department Staff
  department VARCHAR(100) DEFAULT NULL,          -- only used when rank_level = 3, e.g. "Finance"
  short_description TEXT DEFAULT NULL,
  photo_path VARCHAR(255) DEFAULT NULL,
  sort_order INT NOT NULL DEFAULT 0,              -- for rearranging within same rank/department
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- PARTNER ORGANIZATIONS (bottom row of the org chart —
-- e.g. partner community associations / federations)
-- ---------------------------------------------------------
CREATE TABLE partner_organizations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  org_name VARCHAR(150) NOT NULL,
  photo_path VARCHAR(255) DEFAULT NULL,             -- group photo or logo shown on the chart
  sort_order INT NOT NULL DEFAULT 0,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- SERVICES
-- ---------------------------------------------------------
CREATE TABLE services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  summary VARCHAR(300) DEFAULT NULL,              -- one or two lines for the homepage
  description TEXT NOT NULL,                      -- full description (editor HTML) for the Programs page
  icon VARCHAR(60) DEFAULT 'FaHandsHelping',      -- legacy; no longer shown
  image_path VARCHAR(255) DEFAULT NULL,
  sort_order INT NOT NULL DEFAULT 0,              -- display order; the homepage shows the first four
  is_published TINYINT(1) NOT NULL DEFAULT 1,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- POSTS (news / blog / event share one table, filtered by type)
-- ---------------------------------------------------------
CREATE TABLE posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type ENUM('news','blog','event') NOT NULL DEFAULT 'news',
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(220) NOT NULL UNIQUE,
  category VARCHAR(100) DEFAULT NULL,
  author VARCHAR(150) DEFAULT NULL,
  cover_image VARCHAR(255) DEFAULT NULL,
  short_description VARCHAR(500) DEFAULT NULL,
  content LONGTEXT NOT NULL,
  event_date DATETIME DEFAULT NULL,               -- used only when type = 'event'
  event_venue VARCHAR(255) DEFAULT NULL,           -- used only when type = 'event'
  status ENUM('published','draft') NOT NULL DEFAULT 'published',
  admin_id INT DEFAULT NULL,
  published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL,
  FULLTEXT KEY ft_search (title, short_description, content)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- OFFICES (Negros Island locations, shown on Leaflet map)
-- ---------------------------------------------------------
CREATE TABLE offices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  office_name VARCHAR(150) NOT NULL,
  address VARCHAR(255) NOT NULL,
  contact_number VARCHAR(50) DEFAULT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  is_main BOOLEAN DEFAULT FALSE,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- CONTACT MESSAGES
-- ---------------------------------------------------------
CREATE TABLE contact_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL,
  subject VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  mail_sent BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- SETTINGS (org-wide key/value: email, phone, socials, mission, vision...)
-- ---------------------------------------------------------
CREATE TABLE settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  setting_value TEXT
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- PHOTO ALBUMS + their photos (Resources > Photos)
-- ---------------------------------------------------------
CREATE TABLE photo_albums (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  category VARCHAR(100) DEFAULT NULL,              -- e.g. Youth, Livelihood, Parish
  description TEXT DEFAULT NULL,
  event_date DATE DEFAULT NULL,                    -- when the activity happened
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,      -- shown large at the top of the Photos page
  is_published TINYINT(1) NOT NULL DEFAULT 1,      -- 0 = hidden, admin only
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE album_photos (
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
CREATE TABLE enews_issues (
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
  is_published TINYINT(1) NOT NULL DEFAULT 1,       -- 0 = draft, admin only
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE enews_subscribers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(150) NOT NULL UNIQUE,
  subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- MATERIALS (Resources > Materials): modules, reports, IEC posters, policies
-- ---------------------------------------------------------
CREATE TABLE materials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  type ENUM('module','report','poster','policy','other') NOT NULL DEFAULT 'module',
  description TEXT DEFAULT NULL,
  language VARCHAR(100) DEFAULT NULL,              -- e.g. "English, Hiligaynon"
  year SMALLINT DEFAULT NULL,
  file_path VARCHAR(255) DEFAULT NULL,             -- uploaded file, or NULL when it's a link
  file_size INT DEFAULT NULL,
  external_url VARCHAR(500) DEFAULT NULL,          -- e.g. a Google Drive or YouTube link
  cover_image VARCHAR(255) DEFAULT NULL,
  download_count INT NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_published TINYINT(1) NOT NULL DEFAULT 1,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL,
  FULLTEXT KEY ft_materials (title, description)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- LOGIN ATTEMPTS (brute-force lockout; api/login.php also
-- creates this table on demand for older databases)
-- ---------------------------------------------------------
CREATE TABLE login_attempts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL,
  username VARCHAR(50) NOT NULL,
  attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ip_time (ip_address, attempted_at)
) ENGINE=InnoDB;

-- =========================================================
-- SEED DATA
-- =========================================================

-- Default admin -> username: admin / password: Admin@12345
-- (bcrypt hash, verified compatible with PHP's password_verify())
INSERT INTO admins (username, email, password_hash, full_name) VALUES
('admin', 'admin@ngo-example.org', '$2b$10$pM9O1Lf2r5ug.ZT/3yGwM.4KmgHR66OcuIxUFJz9xbNj6CNj/wd6u', 'System Administrator');

INSERT INTO settings (setting_key, setting_value) VALUES
('org_name', 'Negros Bayanihan Foundation'),
('org_email', 'contact@negrosbayanihan.org'),
('org_phone', '+63 34 123 4567'),
('org_address', 'Rizal St., Bacolod City, Negros Occidental, Philippines'),
('facebook_url', 'https://facebook.com'),
('mission', 'To empower Negrosanon communities through sustainable programs in education, health, and livelihood.'),
('vision', 'A resilient and self-reliant Negros where every family thrives with dignity.');

-- Board of Trustees (rank_level 1)
INSERT INTO officers (full_name, position_title, rank_level, department, sort_order) VALUES
('Board Chair Name', 'Board Chair', 1, NULL, 1),
('Board Treasurer Name', 'Board Treasurer', 1, NULL, 2),
('Board Secretary Name', 'Board Secretary', 1, NULL, 3),
('Board Member Name', 'Board Member', 1, NULL, 4),
('Board Member Name', 'Board Member', 1, NULL, 5);

-- Executive Director (rank_level 2)
INSERT INTO officers (full_name, position_title, rank_level, department, sort_order) VALUES
('Executive Director Name', 'Executive Director', 2, NULL, 1);

-- Department staff (rank_level 3) — department must match one of the
-- four buckets rendered on the org chart: Finance, Program,
-- Community Development Worker, Volunteers
INSERT INTO officers (full_name, position_title, rank_level, department, sort_order) VALUES
('Finance Officer Name', 'Finance Officer', 3, 'Finance', 1),
('Bookkeeper Name', 'Bookkeeper', 3, 'Finance', 2),
('Cashier Name', 'Cashier / Disburser', 3, 'Finance', 3),
('Program Coordinator Name', 'Youth Animators Coordinator', 3, 'Program', 1),
('Program Officer Name', 'Literacy & Numeracy Project Officer', 3, 'Program', 2),
('CDW Staff Name', 'Community Development Worker', 3, 'Community Development Worker', 1),
('CDW Staff Name', 'Community Development Worker', 3, 'Community Development Worker', 2),
('Research Director Name', 'Volunteer / Research Director', 3, 'Volunteers', 1);

-- Partner organizations (bottom row of the org chart)
INSERT INTO partner_organizations (org_name, sort_order) VALUES
('KAFABD', 1), ('KAMABAKU', 2), ('AMMAH', 3), ('KAMADA', 4),
('CAVENAS', 5), ('SFA', 6), ('EMA', 7), ('AMMASICO', 8),
('VIVA', 9), ('KUBO', 10), ('KRISCA', 11), ('BSVA', 12),
('LANTONG', 13), ('BMSEA', 14), ('KKDP', 15);

INSERT INTO services (title, description, icon) VALUES
('Community Health Outreach', 'Free medical missions and health education for far-flung communities across Negros.', 'FaHeartbeat'),
('Education Support', 'Scholarships and school-supply drives for underprivileged children.', 'FaGraduationCap'),
('Livelihood Training', 'Skills training and micro-financing to help families build sustainable income.', 'FaHandsHelping'),
('Disaster Relief', 'Emergency response and relief distribution during calamities.', 'FaHandHoldingHeart');

INSERT INTO offices (office_name, address, contact_number, latitude, longitude, is_main) VALUES
('Bacolod Main Office', 'Rizal St., Bacolod City, Negros Occidental', '+63 34 123 4567', 10.6713, 122.9511, TRUE),
('Dumaguete Branch Office', 'Rizal Blvd., Dumaguete City, Negros Oriental', '+63 35 225 1234', 9.3103, 123.3080, FALSE),
('Silay City Office', 'Rizal St., Silay City, Negros Occidental', '+63 34 495 1122', 10.7967, 122.9738, FALSE),
('Bais City Office', 'Real St., Bais City, Negros Oriental', '+63 35 402 5566', 9.5906, 123.1216, FALSE);

INSERT INTO posts (type, title, slug, category, author, short_description, content, status) VALUES
('news', 'Foundation Launches New Health Program in Negros Occidental', 'foundation-launches-new-health-program', 'Health', 'Comms Team', 'A new mobile clinic initiative brings free checkups to remote communities.', 'Full article content goes here...', 'published'),
('blog', 'Why Community-Led Development Works', 'why-community-led-development-works', 'Insights', 'Maria D. Santos', 'Reflections on a decade of grassroots programs.', 'Full article content goes here...', 'published'),
('event', 'Annual Bayanihan Fun Run 2026', 'annual-bayanihan-fun-run-2026', 'Fundraising', 'Events Team', 'Join us for a 5K run supporting scholarship programs.', 'Full event details go here...', 'published');
