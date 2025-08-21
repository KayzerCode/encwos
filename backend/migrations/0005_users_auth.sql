-- Migration number: 0005 	 2025-08-20T10:31:07.764Z
-- users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- helpful index
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);