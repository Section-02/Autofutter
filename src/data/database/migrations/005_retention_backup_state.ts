import type { DatabaseConnection } from '../types';

export const retentionBackupStateMigration = {
  version: 5,
  name: 'retention_backup_state',
  async up(database: DatabaseConnection): Promise<void> {
    await database.execAsync(`
      CREATE TABLE backup_state (
        id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
        is_dirty INTEGER NOT NULL DEFAULT 1 CHECK (is_dirty IN (0, 1)),
        last_success_at TEXT,
        last_attempt_at TEXT,
        last_error TEXT
      );

      INSERT INTO backup_state (id, is_dirty) VALUES (1, 1);

      CREATE TABLE retention_state (
        id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
        last_run_date TEXT
      );

      INSERT INTO retention_state (id, last_run_date) VALUES (1, NULL);
    `);
  },
} as const;
