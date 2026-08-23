import type { DatabaseConnection } from '@/data/database/types';

export type LogDayCompletionRecord = Readonly<{
  date: string;
  ended_at: string;
}>;

export class LogDayCompletionRepository {
  constructor(private readonly database: DatabaseConnection) {}

  async findByDate(date: string): Promise<LogDayCompletionRecord | null> {
    return this.database.getFirstAsync<LogDayCompletionRecord>(
      'SELECT * FROM log_day_completions WHERE date = ?;',
      date,
    );
  }

  async listBetween(startDate: string | null, endDate: string): Promise<LogDayCompletionRecord[]> {
    if (startDate === null) {
      return this.database.getAllAsync<LogDayCompletionRecord>(
        'SELECT * FROM log_day_completions WHERE date <= ? ORDER BY date ASC;',
        endDate,
      );
    }
    return this.database.getAllAsync<LogDayCompletionRecord>(
      `SELECT * FROM log_day_completions
       WHERE date >= ? AND date <= ? ORDER BY date ASC;`,
      startDate,
      endDate,
    );
  }

  async endDay(record: LogDayCompletionRecord): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO log_day_completions (date, ended_at) VALUES (?, ?)
       ON CONFLICT(date) DO NOTHING;`,
      record.date,
      record.ended_at,
    );
  }
}
