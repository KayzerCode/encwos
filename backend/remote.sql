PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE d1_migrations(
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		name       TEXT UNIQUE,
		applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
INSERT INTO d1_migrations VALUES(1,'0001_init.sql','2025-08-17 15:19:24');
INSERT INTO d1_migrations VALUES(2,'0002_seed.sql','2025-08-17 15:19:24');
INSERT INTO d1_migrations VALUES(3,'0003_noteflag.sql','2025-08-19 12:41:45');
INSERT INTO d1_migrations VALUES(4,'0004_add_note_flag.sql','2025-08-19 12:41:45');
INSERT INTO d1_migrations VALUES(5,'0005_users_auth.sql','2025-08-20 13:46:05');
CREATE TABLE folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    parentId INTEGER REFERENCES folders(id) ON DELETE CASCADE,
    createdAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updatedAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
INSERT INTO folders VALUES(1,'Docs',NULL,'2025-08-17T15:19:24.331Z','2025-08-17T18:32:48.898Z');
INSERT INTO folders VALUES(2,'Decoration',NULL,'2025-08-17T15:19:24.331Z','2025-08-18T08:43:15.450Z');
INSERT INTO folders VALUES(7,'CF Worker',1,'2025-08-17T17:54:14.685Z','2025-08-17T18:33:04.238Z');
INSERT INTO folders VALUES(8,'Migrations',1,'2025-08-18T08:32:05.682Z','2025-08-18T08:32:05.682Z');
INSERT INTO folders VALUES(10,'Start App',1,'2025-08-18T12:03:36.328Z','2025-08-18T12:03:36.328Z');
INSERT INTO folders VALUES(11,'GitHub.com',1,'2025-08-21T11:31:43.320Z','2025-08-21T11:31:43.320Z');
CREATE TABLE notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    folderId INTEGER NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT,
    createdAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updatedAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
, flag INTEGER NOT NULL DEFAULT 0);
INSERT INTO notes VALUES(1,2,'Font Awesome Icons',replace('Install via pnpm\ncd frontend\n\n1. Easy way\nInstall \npnpm add @fortawesome/fontawesome-free\nImport (to main, or index, or App.tsx\nimport ''@fortawesome/fontawesome-free/css/all.min.css'';\n\nUsage: \n<button>\n  <i className="fas fa-plus"></i> New note\n</button>\n\n2. Alternate but better but harder way\n\nInstall\npnpm add @fortawesome/fontawesome-svg-core\npnpm add @fortawesome/free-solid-svg-icons\npnpm add @fortawesome/react-fontawesome\nImport\nTo src/index.tsx or src/App.tsx:\ntypescriptimport { library } from ''@fortawesome/fontawesome-svg-core'';\nimport { fas } from ''@fortawesome/free-solid-svg-icons'';\nlibrary.add(fas);\n\nUsage:\nimport { FontAwesomeIcon } from ''@fortawesome/react-fontawesome'';\n\n<button onClick={onCreateNote}>\n  <FontAwesomeIcon icon="plus" /> New note\n</button>\n\nAlternative just needed icons\nimport { FontAwesomeIcon } from ''@fortawesome/react-fontawesome'';\nimport { \n  faPlus, \n  faEdit, \n  faTrash, \n  faList, \n  faRefresh,\n  faFolder,\n  faTimes\n} from ''@fortawesome/free-solid-svg-icons'';\n\n<button onClick={onCreateNote}>\n  <FontAwesomeIcon icon={faPlus} /> New note\n</button>','\n',char(10)),'2025-08-17T15:19:24.331Z','2025-08-18T09:00:00.093Z',0);
INSERT INTO notes VALUES(6,7,'CF Worker for backend',replace('Create a backend/ folder at the root of the project.\n\nInside it:\n\nwrangler.toml (config).\n\npackage.json (for dependencies, if needed).\n\nsrc/index.ts (your endpoints on Hono or pure Workers API).\n\nInstall wrangler → npm i -D wrangler.\n\nAuthorize → npx wrangler login.\n\nCreate a database → wrangler d1 create <name>.\n\nAdd it to wrangler.toml ([[d1_databases]]).\n\nCreate migrations → wrangler d1 migrations create init.\n\nRun them → wrangler d1 migrations apply <db_name>.\n\nDeploy → npx wrangler deploy.\n\nAnd the frontend (React+TS) is already running on /api/..., which returns your backend/index.ts\n\nTranslated with DeepL.com (free version)','\n',char(10)),'2025-08-17T18:33:35.641Z','2025-08-17T18:33:35.641Z',0);
INSERT INTO notes VALUES(7,7,'Hono',replace('Worker API у Cloudflare — это чистый низкоуровневый fetch(request, env). Всё руками: парсинг URL, роутинг, JSON, заголовки и т. д.\n\nHono — это маленький фреймворк поверх этого API. Он даёт:\n\nроутинг (app.get(''/api/notes'', ...) вместо if (url.pathname===''/api/notes'')),\n\nудобный c.json(...), c.req.query(...),\n\nтипизацию (работает хорошо с TypeScript),\n\nmiddleware (CORS, auth, logging и пр.).\n\nТо есть Hono = Express для Cloudflare Workers.\nБез него можно, но будет многословно и неудобно.','\n',char(10)),'2025-08-17T18:34:55.235Z','2025-08-17T18:34:55.235Z',0);
INSERT INTO notes VALUES(8,8,'Commands',replace('#Migration commands (most necessary)\n\n**Create a migration file:**\n\npnpm wrangler d1 migrations create\n\n**Apply migrations:**\n\nlocally → pnpm wrangler d1 migrations apply encwos-db\n\nremotely → pnpm wrangler d1 migrations apply encwos-db --remote (This is usually sufficient. The rest is rare.)\n\n  \n\nHow does it know what has already been applied?\n\nYes. Wrangler/D1 keeps a log of applied migrations in the database itself (a table with migration logs). New files are executed once, while those that have already been applied are skipped. Check (in prod): pnpm wrangler d1 execute encwos-db --remote --command “SELECT \* FROM d1\_migrations ORDER BY applied\_at DESC;” 3) What is --remote and how to live locally/remotely Without --remote, migrations are applied to the local D1 (Miniflare) during development. With --remote — to the remote (Cloudflare) database. Practice: Development: change SQL → pnpm wrangler d1 migrations create ... apply locally → pnpm wrangler d1 migrations apply encwos-db pnpm wrangler dev and test. Before deployment: apply in prod → pnpm wrangler d1 migrations apply encwos-db --remote then pnpm wrangler deploy.','\n',char(10)),'2025-08-18T08:38:38.143Z','2025-08-25T09:16:03.136Z',0);
INSERT INTO notes VALUES(9,10,'Command to start app',replace('# Commands\n\n**Backend**\n\ncd backend\npnpm run dev (local)\n\npnpm run dev --remote (api.encwos.com\n\n**Frontend**\n\ncd frontend\n\npnpm run dev','\n',char(10)),'2025-08-18T12:04:00.962Z','2025-08-25T09:22:18.219Z',0);
INSERT INTO notes VALUES(10,11,'Config at /.ssh/config',replace('Host github.com-inforax\n  HostName github.com\n  User inforax\n  IdentityFile ~/.ssh/inforaxstatic\n\nHost github.com-zlo\n  HostName github.com\n  User zlo.alien@gmail.com\n  IdentityFile ~/.ssh/ .....not yet...','\n',char(10)),'2025-08-21T11:32:28.171Z','2025-08-21T11:32:28.171Z',0);
INSERT INTO notes VALUES(11,11,'Git Remote',replace('# Different repos on GitHub \n\n1. origin  git@github.com-zlo:KayzerCode/encwos.git (fetch)\n\n2. origin  git@github.com-zlo:KayzerCode/encwos.git (push)','\n',char(10)),'2025-08-21T15:27:57.353Z','2025-08-24T09:41:45.672Z',0);
INSERT INTO notes VALUES(12,11,'Test',replace('**Compute**\n\n# Workers & Pages\n\nBuild & deploy serverless functions, sites, and full-stack applications.','\n',char(10)),'2025-08-24T08:48:13.026Z','2025-08-24T10:05:13.535Z',0);
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO users VALUES(4,'inforax@gmail.com','$2b$10$XyANGrD1NZ2plegezPF59Okymw2HoLMdCuvD8KlUmenSH99VmKdA6','2025-08-21 15:26:52');
DELETE FROM sqlite_sequence;
INSERT INTO sqlite_sequence VALUES('d1_migrations',5);
INSERT INTO sqlite_sequence VALUES('folders',11);
INSERT INTO sqlite_sequence VALUES('notes',12);
INSERT INTO sqlite_sequence VALUES('users',4);
CREATE INDEX idx_folders_parentId ON folders(parentId);
CREATE INDEX idx_notes_folderId ON notes(folderId);
CREATE INDEX idx_notes_flag ON notes(flag);
CREATE INDEX idx_users_email ON users(email);
