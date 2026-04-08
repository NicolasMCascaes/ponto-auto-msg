import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const serviceDir = dirname(fileURLToPath(import.meta.url));
const backendRootDir = resolve(serviceDir, '../..');
const databasePath = resolve(backendRootDir, '.data/messages.sqlite');
const LEGACY_DATA_OWNER_EMAIL = 'medeiroscascaes@gmail.com';

mkdirSync(dirname(databasePath), { recursive: true });

const database = new DatabaseSync(databasePath);
database.exec('PRAGMA foreign_keys = ON;');

function tableExists(tableName: string): boolean {
  const statement = database.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
      AND name = ?
    LIMIT 1
  `);

  return Boolean(statement.get(tableName));
}

function hasColumn(tableName: string, columnName: string): boolean {
  if (!tableExists(tableName)) {
    return false;
  }

  const statement = database.prepare(`PRAGMA table_info(${tableName})`);
  const rows = statement.all() as Array<{ name: string }>;

  return rows.some((row) => row.name === columnName);
}

function getTableRowCount(tableName: string): number {
  if (!tableExists(tableName)) {
    return 0;
  }

  const statement = database.prepare(`SELECT COUNT(*) AS total FROM ${tableName}`);
  const row = statement.get() as { total: number } | undefined;

  return Number(row?.total ?? 0);
}

function createUsersTable(): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_email
      ON users(email);
  `);
}

function createUserScopedSchema(): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      phone_number TEXT NOT NULL,
      notes TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS contact_lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL COLLATE NOCASE,
      description TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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
      user_id INTEGER NOT NULL,
      destination_number TEXT NOT NULL,
      content TEXT NOT NULL,
      sent_at TEXT NOT NULL,
      status TEXT NOT NULL,
      error_message TEXT,
      contact_id INTEGER,
      batch_id INTEGER,
      send_mode TEXT NOT NULL DEFAULT 'manual',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS message_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      total_targets INTEGER NOT NULL,
      success_count INTEGER NOT NULL DEFAULT 0,
      failed_count INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS message_log_lists (
      message_log_id INTEGER NOT NULL,
      list_id INTEGER NOT NULL,
      PRIMARY KEY (message_log_id, list_id),
      FOREIGN KEY (message_log_id) REFERENCES message_logs(id) ON DELETE CASCADE,
      FOREIGN KEY (list_id) REFERENCES contact_lists(id) ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_user_phone_unique
      ON contacts(user_id, phone_number);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_contact_lists_user_name_unique
      ON contact_lists(user_id, name);

    CREATE INDEX IF NOT EXISTS idx_contacts_user_is_active
      ON contacts(user_id, is_active);

    CREATE INDEX IF NOT EXISTS idx_contacts_user_name
      ON contacts(user_id, name);

    CREATE INDEX IF NOT EXISTS idx_contact_lists_user_id
      ON contact_lists(user_id);

    CREATE INDEX IF NOT EXISTS idx_contact_list_members_list_id
      ON contact_list_members(list_id);

    CREATE INDEX IF NOT EXISTS idx_message_logs_user_id
      ON message_logs(user_id);

    CREATE INDEX IF NOT EXISTS idx_message_logs_contact_id
      ON message_logs(contact_id);

    CREATE INDEX IF NOT EXISTS idx_message_logs_batch_id
      ON message_logs(batch_id);

    CREATE INDEX IF NOT EXISTS idx_message_batches_user_id
      ON message_batches(user_id);

    CREATE INDEX IF NOT EXISTS idx_message_log_lists_list_id
      ON message_log_lists(list_id);
  `);
}

function getLegacyDataOwnerId(): number | null {
  const statement = database.prepare(`
    SELECT id
    FROM users
    WHERE lower(email) = lower(?)
    LIMIT 1
  `);

  const row = statement.get(LEGACY_DATA_OWNER_EMAIL) as { id: number } | undefined;

  return row ? Number(row.id) : null;
}

function shouldMigrateLegacyGlobalData(): boolean {
  const legacyTables = ['contacts', 'contact_lists', 'message_logs', 'message_batches'];
  const scopedTables = legacyTables.filter((tableName) => hasColumn(tableName, 'user_id'));

  if (scopedTables.length === legacyTables.length) {
    return false;
  }

  if (scopedTables.length > 0 && scopedTables.length < legacyTables.length) {
    throw new Error(
      'Mixed database schema detected. Restore the database or complete the user-scoped migration manually before starting the backend.'
    );
  }

  return legacyTables.some((tableName) => tableExists(tableName));
}

function migrateLegacyGlobalData(): void {
  const legacyOwnerId = getLegacyDataOwnerId();
  const hasLegacyData =
    getTableRowCount('contacts') > 0 ||
    getTableRowCount('contact_lists') > 0 ||
    getTableRowCount('message_logs') > 0 ||
    getTableRowCount('message_batches') > 0;

  if (hasLegacyData && !legacyOwnerId) {
    throw new Error(
      `Legacy data migration requires the user '${LEGACY_DATA_OWNER_EMAIL}' to exist in the users table before startup.`
    );
  }

  const ownerId = legacyOwnerId ?? 0;

  database.exec('PRAGMA foreign_keys = OFF;');

  try {
    database.exec('BEGIN IMMEDIATE;');

    database.exec(`
      ALTER TABLE contacts RENAME TO contacts_legacy;
      ALTER TABLE contact_lists RENAME TO contact_lists_legacy;
      ALTER TABLE contact_list_members RENAME TO contact_list_members_legacy;
      ALTER TABLE message_logs RENAME TO message_logs_legacy;
      ALTER TABLE message_batches RENAME TO message_batches_legacy;
      ALTER TABLE message_log_lists RENAME TO message_log_lists_legacy;
    `);

    createUserScopedSchema();

    database.exec(`
      INSERT INTO contacts (
        id,
        user_id,
        name,
        phone_number,
        notes,
        is_active,
        created_at,
        updated_at
      )
      SELECT
        id,
        ${ownerId},
        name,
        phone_number,
        notes,
        is_active,
        created_at,
        updated_at
      FROM contacts_legacy;

      INSERT INTO contact_lists (
        id,
        user_id,
        name,
        description,
        created_at,
        updated_at
      )
      SELECT
        id,
        ${ownerId},
        name,
        description,
        created_at,
        updated_at
      FROM contact_lists_legacy;

      INSERT INTO contact_list_members (
        contact_id,
        list_id,
        created_at
      )
      SELECT
        contact_id,
        list_id,
        created_at
      FROM contact_list_members_legacy;
    `);

    const contactIdExpression = hasColumn('message_logs_legacy', 'contact_id') ? 'contact_id' : 'NULL';
    const batchIdExpression = hasColumn('message_logs_legacy', 'batch_id') ? 'batch_id' : 'NULL';
    const sendModeExpression = hasColumn('message_logs_legacy', 'send_mode')
      ? 'send_mode'
      : "'manual'";

    database.exec(`
      INSERT INTO message_batches (
        id,
        user_id,
        content,
        created_at,
        total_targets,
        success_count,
        failed_count
      )
      SELECT
        id,
        ${ownerId},
        content,
        created_at,
        total_targets,
        success_count,
        failed_count
      FROM message_batches_legacy;

      INSERT INTO message_logs (
        id,
        user_id,
        destination_number,
        content,
        sent_at,
        status,
        error_message,
        contact_id,
        batch_id,
        send_mode
      )
      SELECT
        id,
        ${ownerId},
        destination_number,
        content,
        sent_at,
        status,
        error_message,
        ${contactIdExpression},
        ${batchIdExpression},
        ${sendModeExpression}
      FROM message_logs_legacy;

      INSERT INTO message_log_lists (
        message_log_id,
        list_id
      )
      SELECT
        message_log_id,
        list_id
      FROM message_log_lists_legacy;

      DROP TABLE message_log_lists_legacy;
      DROP TABLE contact_list_members_legacy;
      DROP TABLE message_logs_legacy;
      DROP TABLE message_batches_legacy;
      DROP TABLE contacts_legacy;
      DROP TABLE contact_lists_legacy;
    `);

    database.exec('COMMIT;');
  } catch (error) {
    try {
      database.exec('ROLLBACK;');
    } catch {
      // Ignore rollback failures caused by SQLite auto-abort semantics.
    }

    throw error;
  } finally {
    database.exec('PRAGMA foreign_keys = ON;');
  }
}

createUsersTable();

if (shouldMigrateLegacyGlobalData()) {
  migrateLegacyGlobalData();
}

createUserScopedSchema();

export { database };
