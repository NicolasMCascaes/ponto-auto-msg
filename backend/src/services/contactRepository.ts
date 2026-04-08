import { database } from './database.js';

export type ContactListReference = {
  id: number;
  name: string;
};

export type ContactRecord = {
  id: number;
  name: string;
  number: string;
  notes?: string;
  isActive: boolean;
  listIds: number[];
  lists: ContactListReference[];
  createdAt: string;
  updatedAt: string;
};

export type ContactFilters = {
  search?: string;
  status?: 'active' | 'inactive';
  listId?: number;
};

export type CreateContactInput = {
  name: string;
  number: string;
  notes?: string;
  isActive: boolean;
  listIds: number[];
};

export type UpdateContactInput = CreateContactInput;

export type ContactRecipient = {
  id: number;
  name: string;
  number: string;
  listIds: number[];
};

class ContactRepository {
  list(userId: number, filters: ContactFilters = {}): ContactRecord[] {
    const where: string[] = ['c.user_id = ?'];
    const params: Array<number | string> = [userId];

    if (filters.status === 'active') {
      where.push('c.is_active = 1');
    }

    if (filters.status === 'inactive') {
      where.push('c.is_active = 0');
    }

    if (typeof filters.listId === 'number') {
      where.push(`
        EXISTS (
          SELECT 1
          FROM contact_list_members clmf
          INNER JOIN contact_lists clf
            ON clf.id = clmf.list_id
          WHERE clmf.contact_id = c.id
            AND clmf.list_id = ?
            AND clf.user_id = c.user_id
        )
      `);
      params.push(filters.listId);
    }

    if (filters.search) {
      where.push(`
        (
          lower(c.name) LIKE lower(?)
          OR c.phone_number LIKE ?
          OR lower(ifnull(c.notes, '')) LIKE lower(?)
        )
      `);
      const term = `%${filters.search}%`;
      params.push(term, term, term);
    }

    const statement = database.prepare(`
      SELECT
        c.id,
        c.name,
        c.phone_number,
        c.notes,
        c.is_active,
        c.created_at,
        c.updated_at,
        cl.id AS list_id,
        cl.name AS list_name
      FROM contacts c
      LEFT JOIN contact_list_members clm
        ON clm.contact_id = c.id
      LEFT JOIN contact_lists cl
        ON cl.id = clm.list_id
       AND cl.user_id = c.user_id
      WHERE ${where.join(' AND ')}
      ORDER BY c.name COLLATE NOCASE ASC, cl.name COLLATE NOCASE ASC
    `);

    const rows = statement.all(...params) as Array<{
      id: number;
      name: string;
      phone_number: string;
      notes: string | null;
      is_active: number;
      created_at: string;
      updated_at: string;
      list_id: number | null;
      list_name: string | null;
    }>;

    return this.mapRowsToContacts(rows);
  }

  getById(userId: number, id: number): ContactRecord | null {
    const statement = database.prepare(`
      SELECT
        c.id,
        c.name,
        c.phone_number,
        c.notes,
        c.is_active,
        c.created_at,
        c.updated_at,
        cl.id AS list_id,
        cl.name AS list_name
      FROM contacts c
      LEFT JOIN contact_list_members clm
        ON clm.contact_id = c.id
      LEFT JOIN contact_lists cl
        ON cl.id = clm.list_id
       AND cl.user_id = c.user_id
      WHERE c.user_id = ?
        AND c.id = ?
      ORDER BY cl.name COLLATE NOCASE ASC
    `);

    const rows = statement.all(userId, id) as Array<{
      id: number;
      name: string;
      phone_number: string;
      notes: string | null;
      is_active: number;
      created_at: string;
      updated_at: string;
      list_id: number | null;
      list_name: string | null;
    }>;

    return this.mapRowsToContacts(rows)[0] ?? null;
  }

  create(userId: number, input: CreateContactInput): ContactRecord {
    const now = new Date().toISOString();
    const statement = database.prepare(`
      INSERT INTO contacts (
        user_id,
        name,
        phone_number,
        notes,
        is_active,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = statement.run(
      userId,
      input.name,
      input.number,
      input.notes ?? null,
      input.isActive ? 1 : 0,
      now,
      now
    );

    const contactId = Number(result.lastInsertRowid);
    this.replaceListMemberships(contactId, input.listIds);
    return this.getById(userId, contactId)!;
  }

  update(userId: number, id: number, input: UpdateContactInput): ContactRecord | null {
    const statement = database.prepare(`
      UPDATE contacts
      SET
        name = ?,
        phone_number = ?,
        notes = ?,
        is_active = ?,
        updated_at = ?
      WHERE id = ?
        AND user_id = ?
    `);

    const result = statement.run(
      input.name,
      input.number,
      input.notes ?? null,
      input.isActive ? 1 : 0,
      new Date().toISOString(),
      id,
      userId
    );

    if (Number(result.changes) === 0) {
      return null;
    }

    this.replaceListMemberships(id, input.listIds);
    return this.getById(userId, id);
  }

  delete(userId: number, id: number): boolean {
    const statement = database.prepare(`
      DELETE FROM contacts
      WHERE id = ?
        AND user_id = ?
    `);
    const result = statement.run(id, userId);

    return Number(result.changes) > 0;
  }

  existsByNumber(userId: number, number: string, excludeId?: number): boolean {
    const statement = database.prepare(`
      SELECT id
      FROM contacts
      WHERE user_id = ?
        AND phone_number = ?
        ${typeof excludeId === 'number' ? 'AND id <> ?' : ''}
      LIMIT 1
    `);

    const row =
      typeof excludeId === 'number'
        ? statement.get(userId, number, excludeId)
        : statement.get(userId, number);

    return Boolean(row);
  }

  count(userId: number): number {
    const statement = database.prepare(`
      SELECT COUNT(*) AS total
      FROM contacts
      WHERE user_id = ?
    `);
    const row = statement.get(userId) as { total: number } | undefined;

    return Number(row?.total ?? 0);
  }

  getRecipientById(userId: number, id: number): ContactRecipient | null {
    const statement = database.prepare(`
      SELECT
        c.id,
        c.name,
        c.phone_number,
        GROUP_CONCAT(clm.list_id) AS list_ids
      FROM contacts c
      LEFT JOIN contact_list_members clm
        ON clm.contact_id = c.id
      LEFT JOIN contact_lists cl
        ON cl.id = clm.list_id
       AND cl.user_id = c.user_id
      WHERE c.user_id = ?
        AND c.id = ?
        AND c.is_active = 1
      GROUP BY c.id
    `);

    const row = statement.get(userId, id) as
      | {
          id: number;
          name: string;
          phone_number: string;
          list_ids: string | null;
        }
      | undefined;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      name: row.name,
      number: row.phone_number,
      listIds: this.parseIdList(row.list_ids)
    };
  }

  getBatchRecipients(userId: number, contactIds: number[], listIds: number[]): ContactRecipient[] {
    const recipients = new Map<number, ContactRecipient>();

    if (contactIds.length > 0) {
      const placeholders = contactIds.map(() => '?').join(', ');
      const statement = database.prepare(`
        SELECT id, name, phone_number
        FROM contacts
        WHERE user_id = ?
          AND is_active = 1
          AND id IN (${placeholders})
      `);

      const rows = statement.all(userId, ...contactIds) as Array<{
        id: number;
        name: string;
        phone_number: string;
      }>;

      for (const row of rows) {
        recipients.set(row.id, {
          id: row.id,
          name: row.name,
          number: row.phone_number,
          listIds: []
        });
      }
    }

    if (listIds.length > 0) {
      const placeholders = listIds.map(() => '?').join(', ');
      const statement = database.prepare(`
        SELECT
          c.id,
          c.name,
          c.phone_number,
          clm.list_id
        FROM contacts c
        INNER JOIN contact_list_members clm
          ON clm.contact_id = c.id
        INNER JOIN contact_lists cl
          ON cl.id = clm.list_id
        WHERE c.user_id = ?
          AND cl.user_id = c.user_id
          AND c.is_active = 1
          AND clm.list_id IN (${placeholders})
      `);

      const rows = statement.all(userId, ...listIds) as Array<{
        id: number;
        name: string;
        phone_number: string;
        list_id: number;
      }>;

      for (const row of rows) {
        const existing = recipients.get(row.id);

        if (existing) {
          if (!existing.listIds.includes(row.list_id)) {
            existing.listIds.push(row.list_id);
          }
          continue;
        }

        recipients.set(row.id, {
          id: row.id,
          name: row.name,
          number: row.phone_number,
          listIds: [row.list_id]
        });
      }
    }

    return [...recipients.values()].sort((left, right) => left.name.localeCompare(right.name));
  }

  private replaceListMemberships(contactId: number, listIds: number[]): void {
    const deleteStatement = database.prepare(`
      DELETE FROM contact_list_members
      WHERE contact_id = ?
    `);
    deleteStatement.run(contactId);

    if (listIds.length === 0) {
      return;
    }

    const statement = database.prepare(`
      INSERT INTO contact_list_members (
        contact_id,
        list_id,
        created_at
      ) VALUES (?, ?, ?)
    `);

    const createdAt = new Date().toISOString();
    for (const listId of listIds) {
      statement.run(contactId, listId, createdAt);
    }
  }

  private mapRowsToContacts(
    rows: Array<{
      id: number;
      name: string;
      phone_number: string;
      notes: string | null;
      is_active: number;
      created_at: string;
      updated_at: string;
      list_id: number | null;
      list_name: string | null;
    }>
  ): ContactRecord[] {
    const contacts = new Map<number, ContactRecord>();

    for (const row of rows) {
      const existing = contacts.get(row.id);

      if (existing) {
        if (typeof row.list_id === 'number' && row.list_name) {
          existing.listIds.push(row.list_id);
          existing.lists.push({
            id: row.list_id,
            name: row.list_name
          });
        }
        continue;
      }

      contacts.set(row.id, {
        id: row.id,
        name: row.name,
        number: row.phone_number,
        notes: row.notes ?? undefined,
        isActive: row.is_active === 1,
        listIds: typeof row.list_id === 'number' ? [row.list_id] : [],
        lists:
          typeof row.list_id === 'number' && row.list_name
            ? [{ id: row.list_id, name: row.list_name }]
            : [],
        createdAt: row.created_at,
        updatedAt: row.updated_at
      });
    }

    return [...contacts.values()];
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
}

export const contactRepository = new ContactRepository();
