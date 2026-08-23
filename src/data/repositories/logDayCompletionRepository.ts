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

  async endDay(record: LogDayCompletionRecord): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO log_day_completions (date, ended_at) VALUES (?, ?)
       ON CONFLICT(date) DO NOTHING;`,
      record.date,
      record.ended_at,
    );
  }
}
