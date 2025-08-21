-- Migration number: 0004 	 2025-08-19T12:03:07.185Z
-- (optional) index for quick filtering
CREATE INDEX IF NOT EXISTS idx_notes_flag ON notes(flag);