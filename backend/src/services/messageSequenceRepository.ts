import { database } from './database.js';

export type MessageSequenceStepRecord = {
  id: number;
  position: number;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type MessageSequenceRecord = {
  id: number;
  title: string;
  cooldownMs: number;
  steps: MessageSequenceStepRecord[];
  createdAt: string;
  updatedAt: string;
};

export type MessageSequenceStepInput = {
  content: string;
};

export type CreateMessageSequenceInput = {
  title: string;
  cooldownMs: number;
  steps: MessageSequenceStepInput[];
};

export type UpdateMessageSequenceInput = CreateMessageSequenceInput;

type SequenceRow = {
  id: number;
  title: string;
  cooldown_ms: number;
  created_at: string;
  updated_at: string;
};

type StepRow = {
  id: number;
  sequence_id: number;
  position: number;
  content: string;
  created_at: string;
  updated_at: string;
};

class MessageSequenceRepository {
  list(userId: number): MessageSequenceRecord[] {
    const statement = database.prepare(`
      SELECT
        id,
        title,
        cooldown_ms,
        created_at,
        updated_at
      FROM message_sequences
      WHERE user_id = ?
      ORDER BY title COLLATE NOCASE ASC, id ASC
    `);

    const rows = statement.all(userId) as SequenceRow[];
    return this.mapSequencesWithSteps(rows);
  }

  getById(userId: number, id: number): MessageSequenceRecord | null {
    const statement = database.prepare(`
      SELECT
        id,
        title,
        cooldown_ms,
        created_at,
        updated_at
      FROM message_sequences
      WHERE user_id = ?
        AND id = ?
      LIMIT 1
    `);

    const row = statement.get(userId, id) as SequenceRow | undefined;

    if (!row) {
      return null;
    }

    return this.mapSequencesWithSteps([row])[0] ?? null;
  }

  create(userId: number, input: CreateMessageSequenceInput): MessageSequenceRecord {
    let sequenceId = 0;

    database.exec('BEGIN IMMEDIATE;');

    try {
      const now = new Date().toISOString();
      const statement = database.prepare(`
        INSERT INTO message_sequences (
          user_id,
          title,
          cooldown_ms,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?)
      `);

      const result = statement.run(userId, input.title, input.cooldownMs, now, now);
      sequenceId = Number(result.lastInsertRowid);
      this.replaceSteps(sequenceId, input.steps);
      database.exec('COMMIT;');
    } catch (error) {
      this.rollbackTransaction();
      throw error;
    }

    return this.getById(userId, sequenceId)!;
  }

  update(userId: number, id: number, input: UpdateMessageSequenceInput): MessageSequenceRecord | null {
    database.exec('BEGIN IMMEDIATE;');

    try {
      const statement = database.prepare(`
        UPDATE message_sequences
        SET
          title = ?,
          cooldown_ms = ?,
          updated_at = ?
        WHERE id = ?
          AND user_id = ?
      `);

      const result = statement.run(
        input.title,
        input.cooldownMs,
        new Date().toISOString(),
        id,
        userId
      );

      if (Number(result.changes) === 0) {
        database.exec('COMMIT;');
        return null;
      }

      this.replaceSteps(id, input.steps);
      database.exec('COMMIT;');
    } catch (error) {
      this.rollbackTransaction();
      throw error;
    }

    return this.getById(userId, id);
  }

  delete(userId: number, id: number): boolean {
    const statement = database.prepare(`
      DELETE FROM message_sequences
      WHERE id = ?
        AND user_id = ?
    `);

    const result = statement.run(id, userId);
    return Number(result.changes) > 0;
  }

  private mapSequencesWithSteps(sequenceRows: SequenceRow[]): MessageSequenceRecord[] {
    if (sequenceRows.length === 0) {
      return [];
    }

    const sequenceIds = sequenceRows.map((row) => row.id);
    const placeholders = sequenceIds.map(() => '?').join(', ');
    const stepStatement = database.prepare(`
      SELECT
        id,
        sequence_id,
        position,
        content,
        created_at,
        updated_at
      FROM message_sequence_steps
      WHERE sequence_id IN (${placeholders})
      ORDER BY sequence_id ASC, position ASC, id ASC
    `);

    const stepRows = stepStatement.all(...sequenceIds) as StepRow[];
    const stepsBySequenceId = new Map<number, MessageSequenceStepRecord[]>();

    for (const row of stepRows) {
      const steps = stepsBySequenceId.get(row.sequence_id) ?? [];
      steps.push({
        id: row.id,
        position: row.position,
        content: row.content,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      });
      stepsBySequenceId.set(row.sequence_id, steps);
    }

    return sequenceRows.map((row) => ({
      id: row.id,
      title: row.title,
      cooldownMs: row.cooldown_ms,
      steps: stepsBySequenceId.get(row.id) ?? [],
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  private replaceSteps(sequenceId: number, steps: MessageSequenceStepInput[]): void {
    const deleteStatement = database.prepare(`
      DELETE FROM message_sequence_steps
      WHERE sequence_id = ?
    `);
    deleteStatement.run(sequenceId);

    const insertStatement = database.prepare(`
      INSERT INTO message_sequence_steps (
        sequence_id,
        position,
        content,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString();

    for (const [index, step] of steps.entries()) {
      insertStatement.run(sequenceId, index + 1, step.content, now, now);
    }
  }

  private rollbackTransaction(): void {
    try {
      database.exec('ROLLBACK;');
    } catch {
      // Ignore rollback failures caused by SQLite auto-abort semantics.
    }
  }
}

export const messageSequenceRepository = new MessageSequenceRepository();
