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
  list(): ContactListRecord[] {
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
      GROUP BY cl.id
      ORDER BY cl.name COLLATE NOCASE ASC
    `);

    const rows = statement.all() as Array<{
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

  create(input: CreateContactListInput): ContactListRecord {
    const now = new Date().toISOString();
    const statement = database.prepare(`
      INSERT INTO contact_lists (
        name,
        description,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?)
    `);

    const result = statement.run(input.name, input.description ?? null, now, now);
    return this.getById(Number(result.lastInsertRowid))!;
  }

  update(id: number, input: UpdateContactListInput): ContactListRecord | null {
    const statement = database.prepare(`
      UPDATE contact_lists
      SET
        name = ?,
        description = ?,
        updated_at = ?
      WHERE id = ?
    `);

    statement.run(input.name, input.description ?? null, new Date().toISOString(), id);
    return this.getById(id);
  }

  delete(id: number): boolean {
    const statement = database.prepare(`DELETE FROM contact_lists WHERE id = ?`);
    const result = statement.run(id);

    return Number(result.changes) > 0;
  }

  existsByName(name: string, excludeId?: number): boolean {
    const statement = database.prepare(`
      SELECT id
      FROM contact_lists
      WHERE lower(name) = lower(?)
      ${typeof excludeId === 'number' ? 'AND id <> ?' : ''}
      LIMIT 1
    `);

    const row =
      typeof excludeId === 'number'
        ? statement.get(name, excludeId)
        : statement.get(name);

    return Boolean(row);
  }

  allExist(ids: number[]): boolean {
    if (ids.length === 0) {
      return true;
    }

    const placeholders = ids.map(() => '?').join(', ');
    const statement = database.prepare(`
      SELECT COUNT(*) AS total
      FROM contact_lists
      WHERE id IN (${placeholders})
    `);

    const row = statement.get(...ids) as { total: number } | undefined;
    return Number(row?.total ?? 0) === ids.length;
  }

  private getById(id: number): ContactListRecord | null {
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
      WHERE cl.id = ?
      GROUP BY cl.id
    `);

    const row = statement.get(id) as
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
