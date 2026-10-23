-- =========================================================
-- Migration: email features (unsubscribe tokens, issue mailing
-- log, replies to contact messages).
-- Optional: the API adds these columns automatically.
-- =========================================================
ALTER TABLE enews_subscribers ADD COLUMN token CHAR(32) DEFAULT NULL, ADD UNIQUE KEY uq_enews_token (token);
ALTER TABLE enews_issues ADD COLUMN emailed_at DATETIME DEFAULT NULL, ADD COLUMN emailed_count INT NOT NULL DEFAULT 0;
ALTER TABLE contact_messages ADD COLUMN replied_at DATETIME DEFAULT NULL, ADD COLUMN reply_text TEXT DEFAULT NULL;
