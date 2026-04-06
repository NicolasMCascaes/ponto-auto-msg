import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export type MessageLogStatus = 'sent' | 'failed';

export type CreateMessageLogInput = {
  destinationNumber: string;
  content: string;
  sentAt: string;
  status: MessageLogStatus;
  errorMessage?: string;
};

export type MessageLog = {
  id: number;
  destinationNumber: string;
  content: string;
  sentAt: string;
  status: MessageLogStatus;
  errorMessage?: string;
};

class MessageLogRepository {
  private readonly database: DatabaseSync;

  constructor(databasePath = './.data/messages.sqlite') {
    const resolvedPath = resolve(databasePath);
    mkdirSync(dirname(resolvedPath), { recursive: true });

    this.database = new DatabaseSync(resolvedPath);
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS message_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        destination_number TEXT NOT NULL,
        content TEXT NOT NULL,
        sent_at TEXT NOT NULL,
        status TEXT NOT NULL,
        error_message TEXT
      )
    `);
  }

  create(input: CreateMessageLogInput): number {
    const statement = this.database.prepare(`
      INSERT INTO message_logs (
        destination_number,
        content,
        sent_at,
        status,
        error_message
      ) VALUES (?, ?, ?, ?, ?)
    `);

    const result = statement.run(
      input.destinationNumber,
      input.content,
      input.sentAt,
      input.status,
      input.errorMessage ?? null
    );

    return Number(result.lastInsertRowid);
  }

  listRecent(limit = 10): MessageLog[] {
    const statement = this.database.prepare(`
      SELECT id, destination_number, content, sent_at, status, error_message
      FROM message_logs
      ORDER BY id DESC
      LIMIT ?
    `);

    const rows = statement.all(limit) as Array<{
      id: number;
      destination_number: string;
      content: string;
      sent_at: string;
      status: MessageLogStatus;
      error_message: string | null;
    }>;

    return rows.map((row) => ({
      id: row.id,
      destinationNumber: row.destination_number,
      content: row.content,
      sentAt: row.sent_at,
      status: row.status,
      errorMessage: row.error_message ?? undefined
    }));
  }
}

export const messageLogRepository = new MessageLogRepository();
