-- add int flag to notes (0/1)
ALTER TABLE notes ADD COLUMN flag INTEGER NOT NULL DEFAULT 0;
