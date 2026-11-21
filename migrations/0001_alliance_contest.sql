PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS contest_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contest_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL UNIQUE,
  rank TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contest_submissions (
  id TEXT PRIMARY KEY,
  member_id INTEGER NOT NULL UNIQUE,
  edit_code_hash TEXT NOT NULL,
  final_image_key TEXT,
  final_image_mime TEXT,
  display_label TEXT,
  published INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES contest_members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS contest_submission_images (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  sort_order INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (submission_id) REFERENCES contest_submissions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS contest_votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  round INTEGER NOT NULL CHECK (round IN (1, 2)),
  first_submission_id TEXT NOT NULL,
  second_submission_id TEXT,
  third_submission_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (member_id, round),
  FOREIGN KEY (member_id) REFERENCES contest_members(id) ON DELETE CASCADE,
  FOREIGN KEY (first_submission_id) REFERENCES contest_submissions(id) ON DELETE CASCADE,
  FOREIGN KEY (second_submission_id) REFERENCES contest_submissions(id) ON DELETE CASCADE,
  FOREIGN KEY (third_submission_id) REFERENCES contest_submissions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_contest_images_submission
  ON contest_submission_images(submission_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_contest_submissions_published
  ON contest_submissions(published, display_label);

CREATE INDEX IF NOT EXISTS idx_contest_votes_round
  ON contest_votes(round, first_submission_id);
