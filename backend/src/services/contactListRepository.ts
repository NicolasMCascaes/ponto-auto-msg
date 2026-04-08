import { database } from './database.js';

export type ContactListRecord = {
  id: number;
  name: string;
  description?: string;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateContactListInput = {
  name: string;
  description?: string;
};

export type UpdateContactListInput = {
  name: string;
  description?: string;
};

class ContactListRepository {
  list(userId: number): ContactListRecord[] {
    const statement = database.prepare(`
      SELECT
        cl.id,
        cl.name,
        cl.description,
        cl.created_at,
        cl.updated_at,
        COUNT(clm.contact_id) AS member_count
      FROM contact_lists cl
      LEFT JOIN contact_list_members clm
        ON clm.list_id = cl.id
      WHERE cl.user_id = ?
      GROUP BY cl.id
      ORDER BY cl.name COLLATE NOCASE ASC
    `);

    const rows = statement.all(userId) as Array<{
      id: number;
      name: string;
      description: string | null;
      created_at: string;
      updated_at: string;
      member_count: number;
    }>;

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      memberCount: Number(row.member_count),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  create(userId: number, input: CreateContactListInput): ContactListRecord {
    const now = new Date().toISOString();
    const statement = database.prepare(`
      INSERT INTO contact_lists (
        user_id,
        name,
        description,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?)
    `);

    const result = statement.run(userId, input.name, input.description ?? null, now, now);
    return this.getById(userId, Number(result.lastInsertRowid))!;
  }

  update(userId: number, id: number, input: UpdateContactListInput): ContactListRecord | null {
    const statement = database.prepare(`
      UPDATE contact_lists
      SET
        name = ?,
        description = ?,
        updated_at = ?
      WHERE id = ?
        AND user_id = ?
    `);

    const result = statement.run(input.name, input.description ?? null, new Date().toISOString(), id, userId);

    if (Number(result.changes) === 0) {
      return null;
    }

    return this.getById(userId, id);
  }

  delete(userId: number, id: number): boolean {
    const statement = database.prepare(`
      DELETE FROM contact_lists
      WHERE id = ?
        AND user_id = ?
    `);
    const result = statement.run(id, userId);

    return Number(result.changes) > 0;
  }

  existsByName(userId: number, name: string, excludeId?: number): boolean {
    const statement = database.prepare(`
      SELECT id
      FROM contact_lists
      WHERE user_id = ?
        AND lower(name) = lower(?)
        ${typeof excludeId === 'number' ? 'AND id <> ?' : ''}
      LIMIT 1
    `);

    const row =
      typeof excludeId === 'number'
        ? statement.get(userId, name, excludeId)
        : statement.get(userId, name);

    return Boolean(row);
  }

  allExist(userId: number, ids: number[]): boolean {
    if (ids.length === 0) {
      return true;
    }

    const placeholders = ids.map(() => '?').join(', ');
    const statement = database.prepare(`
      SELECT COUNT(*) AS total
      FROM contact_lists
      WHERE user_id = ?
        AND id IN (${placeholders})
    `);

    const row = statement.get(userId, ...ids) as { total: number } | undefined;
    return Number(row?.total ?? 0) === ids.length;
  }

  private getById(userId: number, id: number): ContactListRecord | null {
    const statement = database.prepare(`
      SELECT
        cl.id,
        cl.name,
        cl.description,
        cl.created_at,
        cl.updated_at,
        COUNT(clm.contact_id) AS member_count
      FROM contact_lists cl
      LEFT JOIN contact_list_members clm
        ON clm.list_id = cl.id
      WHERE cl.user_id = ?
        AND cl.id = ?
      GROUP BY cl.id
    `);

    const row = statement.get(userId, id) as
      | {
          id: number;
          name: string;
          description: string | null;
          created_at: string;
          updated_at: string;
          member_count: number;
        }
      | undefined;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      memberCount: Number(row.member_count),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

export const contactListRepository = new ContactListRepository();
