import { database } from './database.js';

export type MessageLogStatus = 'sent' | 'failed';
export type MessageSendMode = 'manual' | 'contact' | 'batch' | 'sequence';

export type CreateMessageLogInput = {
  userId: number;
  destinationNumber: string;
  content: string;
  sentAt: string;
  status: MessageLogStatus;
  errorMessage?: string;
  contactId?: number;
  batchId?: number;
  sendMode: MessageSendMode;
  listIds?: number[];
};

export type MessageFilters = {
  limit?: number;
  status?: MessageLogStatus;
  contactId?: number;
  listId?: number;
  search?: string;
};

export type MessageBatchRecord = {
  id: number;
  content: string;
  totalTargets: number;
  successCount: number;
  failedCount: number;
  createdAt: string;
};

export type MessageLogRecord = {
  id: number;
  destinationNumber: string;
  content: string;
  sentAt: string;
  status: MessageLogStatus;
  errorMessage?: string;
  contactId?: number;
  contactName?: string;
  batchId?: number;
  sendMode: MessageSendMode;
  listIds: number[];
  listNames: string[];
};

class MessageLogRepository {
  create(input: CreateMessageLogInput): number {
    const statement = database.prepare(`
      INSERT INTO message_logs (
        user_id,
        destination_number,
        content,
        sent_at,
        status,
        error_message,
        contact_id,
        batch_id,
        send_mode
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = statement.run(
      input.userId,
      input.destinationNumber,
      input.content,
      input.sentAt,
      input.status,
      input.errorMessage ?? null,
      input.contactId ?? null,
      input.batchId ?? null,
      input.sendMode
    );

    const messageLogId = Number(result.lastInsertRowid);

    if (input.listIds && input.listIds.length > 0) {
      const linkStatement = database.prepare(`
        INSERT OR IGNORE INTO message_log_lists (
          message_log_id,
          list_id
        ) VALUES (?, ?)
      `);

      for (const listId of input.listIds) {
        linkStatement.run(messageLogId, listId);
      }
    }

    return messageLogId;
  }

  listRecent(userId: number, limit = 10): MessageLogRecord[] {
    return this.list(userId, {
      limit
    });
  }

  list(userId: number, filters: MessageFilters = {}): MessageLogRecord[] {
    const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200);
    const where: string[] = ['ml.user_id = ?'];
    const params: Array<number | string> = [userId];

    if (filters.status) {
      where.push('ml.status = ?');
      params.push(filters.status);
    }

    if (typeof filters.contactId === 'number') {
      where.push('ml.contact_id = ?');
      params.push(filters.contactId);
    }

    if (typeof filters.listId === 'number') {
      where.push(`
        EXISTS (
          SELECT 1
          FROM message_log_lists mll_filter
          INNER JOIN contact_lists cl_filter
            ON cl_filter.id = mll_filter.list_id
          WHERE mll_filter.message_log_id = ml.id
            AND mll_filter.list_id = ?
            AND cl_filter.user_id = ml.user_id
        )
      `);
      params.push(filters.listId);
    }

    if (filters.search) {
      where.push(`
        (
          lower(ifnull(c.name, '')) LIKE lower(?)
          OR ml.destination_number LIKE ?
          OR lower(ml.content) LIKE lower(?)
        )
      `);
      const term = `%${filters.search}%`;
      params.push(term, term, term);
    }

    const statement = database.prepare(`
      SELECT
        ml.id,
        ml.destination_number,
        ml.content,
        ml.sent_at,
        ml.status,
        ml.error_message,
        ml.contact_id,
        c.name AS contact_name,
        ml.batch_id,
        ml.send_mode,
        GROUP_CONCAT(DISTINCT mll.list_id) AS list_ids,
        GROUP_CONCAT(DISTINCT cl.name) AS list_names
      FROM message_logs ml
      LEFT JOIN contacts c
        ON c.id = ml.contact_id
       AND c.user_id = ml.user_id
      LEFT JOIN message_log_lists mll
        ON mll.message_log_id = ml.id
      LEFT JOIN contact_lists cl
        ON cl.id = mll.list_id
       AND cl.user_id = ml.user_id
      WHERE ${where.join(' AND ')}
      GROUP BY ml.id
      ORDER BY ml.sent_at DESC, ml.id DESC
      LIMIT ?
    `);

    const rows = statement.all(...params, limit) as Array<{
      id: number;
      destination_number: string;
      content: string;
      sent_at: string;
      status: MessageLogStatus;
      error_message: string | null;
      contact_id: number | null;
      contact_name: string | null;
      batch_id: number | null;
      send_mode: MessageSendMode;
      list_ids: string | null;
      list_names: string | null;
    }>;

    return rows.map((row) => ({
      id: row.id,
      destinationNumber: row.destination_number,
      content: row.content,
      sentAt: row.sent_at,
      status: row.status,
      errorMessage: row.error_message ?? undefined,
      contactId: row.contact_id ?? undefined,
      contactName: row.contact_name ?? undefined,
      batchId: row.batch_id ?? undefined,
      sendMode: row.send_mode,
      listIds: this.parseIdList(row.list_ids),
      listNames: this.parseTextList(row.list_names)
    }));
  }

  createBatch(userId: number, content: string, totalTargets: number): MessageBatchRecord {
    const createdAt = new Date().toISOString();
    const statement = database.prepare(`
      INSERT INTO message_batches (
        user_id,
        content,
        created_at,
        total_targets,
        success_count,
        failed_count
      ) VALUES (?, ?, ?, ?, 0, 0)
    `);

    const result = statement.run(userId, content, createdAt, totalTargets);
    return {
      id: Number(result.lastInsertRowid),
      content,
      totalTargets,
      successCount: 0,
      failedCount: 0,
      createdAt
    };
  }

  updateBatchCounts(userId: number, id: number, successCount: number, failedCount: number): void {
    const statement = database.prepare(`
      UPDATE message_batches
      SET
        success_count = ?,
        failed_count = ?
      WHERE id = ?
        AND user_id = ?
    `);

    statement.run(successCount, failedCount, id, userId);
  }

  private parseIdList(value: string | null): number[] {
    if (!value) {
      return [];
    }

    return value
      .split(',')
      .map((item) => Number.parseInt(item, 10))
      .filter((item) => Number.isFinite(item));
  }

  private parseTextList(value: string | null): string[] {
    if (!value) {
      return [];
    }

    return value.split(',').filter(Boolean);
  }
}

export const messageLogRepository = new MessageLogRepository();
