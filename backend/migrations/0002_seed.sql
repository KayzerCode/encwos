-- Migration number: 0002 	 2025-08-17T14:46:03.787Z
-- Insert top-level folders
INSERT INTO folders (name, parentId) VALUES ('All', NULL);
INSERT INTO folders (name, parentId) VALUES ('Inbox', NULL);
INSERT INTO folders (name, parentId) VALUES ('Work', 1);  -- child of All
INSERT INTO folders (name, parentId) VALUES ('Ideas', 3); -- child of Work

-- Insert notes
INSERT INTO notes (folderId, title, body) VALUES (2, 'Welcome to Inbox', 'This is your first note in Inbox');
INSERT INTO notes (folderId, title, body) VALUES (3, 'Work task', 'Don’t forget to finish EncWos migration');
INSERT INTO notes (folderId, title, body) VALUES (4, 'App idea', 'Build an AI assistant integration');
