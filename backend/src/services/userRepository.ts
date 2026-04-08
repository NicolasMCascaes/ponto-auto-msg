import { database } from './database.js';

export type UserRecord = {
  id: number;
  email: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
};

export type PublicUserRecord = Omit<UserRecord, 'passwordHash'>;

export type CreateUserInput = {
  email: string;
  passwordHash: string;
};

class UserRepository {
  findByEmail(email: string): UserRecord | null {
    const statement = database.prepare(`
      SELECT id, email, password_hash, created_at, updated_at
      FROM users
      WHERE email = ?
      LIMIT 1
    `);

    const row = statement.get(email) as
      | {
          id: number;
          email: string;
          password_hash: string;
          created_at: string;
          updated_at: string;
        }
      | undefined;

    return row ? this.mapRow(row) : null;
  }

  findById(id: number): PublicUserRecord | null {
    const statement = database.prepare(`
      SELECT id, email, created_at, updated_at
      FROM users
      WHERE id = ?
      LIMIT 1
    `);

    const row = statement.get(id) as
      | {
          id: number;
          email: string;
          created_at: string;
          updated_at: string;
        }
      | undefined;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      email: row.email,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  create(input: CreateUserInput): PublicUserRecord {
    const now = new Date().toISOString();
    const statement = database.prepare(`
      INSERT INTO users (
        email,
        password_hash,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?)
    `);

    const result = statement.run(input.email, input.passwordHash, now, now);
    const userId = Number(result.lastInsertRowid);

    return this.findById(userId)!;
  }

  existsByEmail(email: string): boolean {
    const statement = database.prepare(`
      SELECT id
      FROM users
      WHERE email = ?
      LIMIT 1
    `);

    return Boolean(statement.get(email));
  }

  private mapRow(row: {
    id: number;
    email: string;
    password_hash: string;
    created_at: string;
    updated_at: string;
  }): UserRecord {
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

export const userRepository = new UserRepository();
