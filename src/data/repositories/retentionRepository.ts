import type { DatabaseConnection } from '@/data/database/types';

export class RetentionRepository {
  constructor(private readonly database: DatabaseConnection) {}

  async getLastRunDate(): Promise<string | null> {
    const row = await this.database.getFirstAsync<{ last_run_date: string | null }>(
      'SELECT last_run_date FROM retention_state WHERE id = 1;',
    );
    return row?.last_run_date ?? null;
  }

  async setLastRunDate(date: string): Promise<void> {
    await this.database.runAsync(
      'UPDATE retention_state SET last_run_date = ? WHERE id = 1;',
      date,
    );
  }

  async listExpiredLogDates(cutoffDate: string): Promise<string[]> {
    const rows = await this.database.getAllAsync<{ log_date: string }>(
      `SELECT DISTINCT log_date FROM food_log_entries
       WHERE log_date < ? ORDER BY log_date;`,
      cutoffDate,
    );
    return rows.map(({ log_date }) => log_date);
  }

  async deleteExpiredLogs(cutoffDate: string): Promise<number> {
    const count = await this.database.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM food_log_entries WHERE log_date < ?;',
      cutoffDate,
    );
    await this.database.runAsync(
      'DELETE FROM food_log_entries WHERE log_date < ?;',
      cutoffDate,
    );
    return count?.count ?? 0;
  }
}
