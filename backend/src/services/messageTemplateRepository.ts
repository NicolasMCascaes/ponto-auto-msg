import { database } from './database.js';
import type { MessageTemplateGroup } from '../utils/messageTemplates.js';

export type MessageTemplateRecord = {
  id: number;
  group: MessageTemplateGroup;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateMessageTemplateInput = {
  group: MessageTemplateGroup;
  title: string;
  content: string;
};

export type UpdateMessageTemplateInput = CreateMessageTemplateInput;

class MessageTemplateRepository {
  list(userId: number): MessageTemplateRecord[] {
    const statement = database.prepare(`
      SELECT
        id,
        group_type,
        title,
        content,
        created_at,
        updated_at
      FROM message_templates
      WHERE user_id = ?
      ORDER BY
        CASE group_type
          WHEN 'teacher' THEN 0
          ELSE 1
        END,
        title COLLATE NOCASE ASC,
        id ASC
    `);

    const rows = statement.all(userId) as Array<{
      id: number;
      group_type: MessageTemplateGroup;
      title: string;
      content: string;
      created_at: string;
      updated_at: string;
    }>;

    return rows.map((row) => this.mapRow(row));
  }

  listByGroups(userId: number, groups: MessageTemplateGroup[]): MessageTemplateRecord[] {
    if (groups.length === 0) {
      return [];
    }

    const placeholders = groups.map(() => '?').join(', ');
    const statement = database.prepare(`
      SELECT
        id,
        group_type,
        title,
        content,
        created_at,
        updated_at
      FROM message_templates
      WHERE user_id = ?
        AND group_type IN (${placeholders})
      ORDER BY title COLLATE NOCASE ASC, id ASC
    `);

    const rows = statement.all(userId, ...groups) as Array<{
      id: number;
      group_type: MessageTemplateGroup;
      title: string;
      content: string;
      created_at: string;
      updated_at: string;
    }>;

    return rows.map((row) => this.mapRow(row));
  }

  getById(userId: number, id: number): MessageTemplateRecord | null {
    const statement = database.prepare(`
      SELECT
        id,
        group_type,
        title,
        content,
        created_at,
        updated_at
      FROM message_templates
      WHERE user_id = ?
        AND id = ?
      LIMIT 1
    `);

    const row = statement.get(userId, id) as
      | {
          id: number;
          group_type: MessageTemplateGroup;
          title: string;
          content: string;
          created_at: string;
          updated_at: string;
        }
      | undefined;

    return row ? this.mapRow(row) : null;
  }

  create(userId: number, input: CreateMessageTemplateInput): MessageTemplateRecord {
    const now = new Date().toISOString();
    const statement = database.prepare(`
      INSERT INTO message_templates (
        user_id,
        group_type,
        title,
        content,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = statement.run(userId, input.group, input.title, input.content, now, now);
    return this.getById(userId, Number(result.lastInsertRowid))!;
  }

  update(userId: number, id: number, input: UpdateMessageTemplateInput): MessageTemplateRecord | null {
    const statement = database.prepare(`
      UPDATE message_templates
      SET
        group_type = ?,
        title = ?,
        content = ?,
        updated_at = ?
      WHERE id = ?
        AND user_id = ?
    `);

    const result = statement.run(
      input.group,
      input.title,
      input.content,
      new Date().toISOString(),
      id,
      userId
    );

    if (Number(result.changes) === 0) {
      return null;
    }

    return this.getById(userId, id);
  }

  delete(userId: number, id: number): boolean {
    const statement = database.prepare(`
      DELETE FROM message_templates
      WHERE id = ?
        AND user_id = ?
    `);

    const result = statement.run(id, userId);
    return Number(result.changes) > 0;
  }

  private mapRow(row: {
    id: number;
    group_type: MessageTemplateGroup;
    title: string;
    content: string;
    created_at: string;
    updated_at: string;
  }): MessageTemplateRecord {
    return {
      id: row.id,
      group: row.group_type,
      title: row.title,
      content: row.content,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

export const messageTemplateRepository = new MessageTemplateRepository();
