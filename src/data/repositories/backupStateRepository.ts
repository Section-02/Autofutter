import type { DatabaseConnection } from '@/data/database/types';

export type BackupStateRecord = Readonly<{
  is_dirty: 0 | 1;
  last_success_at: string | null;
  last_attempt_at: string | null;
  last_error: string | null;
}>;

export type BackupStatus = 'up_to_date' | 'pending' | 'failed';

export class BackupStateRepository {
  constructor(private readonly database: DatabaseConnection) {}

  async get(): Promise<BackupStateRecord> {
    const state = await this.database.getFirstAsync<BackupStateRecord>(
      `SELECT is_dirty, last_success_at, last_attempt_at, last_error
       FROM backup_state WHERE id = 1;`,
    );
    if (!state) {
      throw new Error('Backup state is unavailable.');
    }
    return state;
  }

  async markDirty(): Promise<void> {
    await this.database.runAsync(
      'UPDATE backup_state SET is_dirty = 1, last_error = NULL WHERE id = 1;',
    );
  }

  async markSucceeded(timestamp: string): Promise<void> {
    await this.database.runAsync(
      `UPDATE backup_state
       SET is_dirty = 0, last_success_at = ?, last_attempt_at = ?, last_error = NULL
       WHERE id = 1;`,
      timestamp,
      timestamp,
    );
  }

  async markFailed(timestamp: string, message: string): Promise<void> {
    await this.database.runAsync(
      `UPDATE backup_state
       SET is_dirty = 1, last_attempt_at = ?, last_error = ? WHERE id = 1;`,
      timestamp,
      message,
    );
  }
}

export function getBackupStatus(state: BackupStateRecord): BackupStatus {
  if (state.last_error) {
    return 'failed';
  }
  return state.is_dirty === 1 ? 'pending' : 'up_to_date';
}
