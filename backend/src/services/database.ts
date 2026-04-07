import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const serviceDir = dirname(fileURLToPath(import.meta.url));
const backendRootDir = resolve(serviceDir, '../..');
const databasePath = resolve(backendRootDir, '.data/messages.sqlite');

mkdirSync(dirname(databasePath), { recursive: true });

const database = new DatabaseSync(databasePath);
database.exec('PRAGMA foreign_keys = ON;');

function hasColumn(tableName: string, columnName: string): boolean {
  const statement = database.prepare(`PRAGMA table_info(${tableName})`);
  const rows = statement.all() as Array<{ name: string }>;

  return rows.some((row) => row.name === columnName);
}

function ensureColumn(tableName: string, columnName: string, definition: string): void {
  if (hasColumn(tableName, columnName)) {
    return;
  }

  database.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
}

database.exec(`
  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone_number TEXT NOT NULL UNIQUE,
    notes TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS contact_lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS contact_list_members (
    contact_id INTEGER NOT NULL,
    list_id INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (contact_id, list_id),
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
    FOREIGN KEY (list_id) REFERENCES contact_lists(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS message_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    destination_number TEXT NOT NULL,
    content TEXT NOT NULL,
    sent_at TEXT NOT NULL,
    status TEXT NOT NULL,
    error_message TEXT
  );

  CREATE TABLE IF NOT EXISTS message_batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    total_targets INTEGER NOT NULL,
    success_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS message_log_lists (
    message_log_id INTEGER NOT NULL,
    list_id INTEGER NOT NULL,
    PRIMARY KEY (message_log_id, list_id),
    FOREIGN KEY (message_log_id) REFERENCES message_logs(id) ON DELETE CASCADE,
    FOREIGN KEY (list_id) REFERENCES contact_lists(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_contact_list_members_list_id
    ON contact_list_members(list_id);

  CREATE INDEX IF NOT EXISTS idx_contacts_is_active
    ON contacts(is_active);
`);

ensureColumn('message_logs', 'contact_id', 'INTEGER');
ensureColumn('message_logs', 'batch_id', 'INTEGER');
ensureColumn('message_logs', 'send_mode', "TEXT NOT NULL DEFAULT 'manual'");

database.exec(`
  CREATE INDEX IF NOT EXISTS idx_message_logs_contact_id
    ON message_logs(contact_id);

  CREATE INDEX IF NOT EXISTS idx_message_logs_batch_id
    ON message_logs(batch_id);

  CREATE INDEX IF NOT EXISTS idx_message_log_lists_list_id
    ON message_log_lists(list_id);
`);

export { database };
