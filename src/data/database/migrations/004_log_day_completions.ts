import type { DatabaseConnection } from '../types';

export const logDayCompletionsMigration = {
  version: 4,
  name: 'log_day_completions',
  async up(database: DatabaseConnection): Promise<void> {
    await database.execAsync(`
      CREATE TABLE log_day_completions (
        date TEXT PRIMARY KEY NOT NULL,
        ended_at TEXT NOT NULL
      );
    `);
  },
} as const;
