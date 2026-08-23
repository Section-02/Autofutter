import type { DatabaseConnection } from '../types';

export const retentionStateMigration = {
  version: 5,
  name: 'retention_state',
  async up(database: DatabaseConnection): Promise<void> {
    await database.execAsync(`
      CREATE TABLE retention_state (
        id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
        last_run_date TEXT
      );

      INSERT INTO retention_state (id, last_run_date) VALUES (1, NULL);
    `);
  },
} as const;
