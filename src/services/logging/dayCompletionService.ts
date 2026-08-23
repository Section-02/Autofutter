import type { DatabaseConnection } from '@/data/database/types';
import { LogDayCompletionRepository } from '@/data/repositories/logDayCompletionRepository';
import { assertLocalDate, toLocalDateString } from '@/utils/dates';

type Options = Readonly<{ now?: () => Date }>;

export class DayCompletionService {
  private readonly now: () => Date;

  constructor(private readonly database: DatabaseConnection, options: Options = {}) {
    this.now = options.now ?? (() => new Date());
  }

  async endDay(date: string): Promise<void> {
    assertLocalDate(date);
    const now = this.now();
    if (date > toLocalDateString(now)) throw new Error('Future days cannot be ended.');
    await new LogDayCompletionRepository(this.database).endDay({
      date,
      ended_at: now.toISOString(),
    });
  }
}
