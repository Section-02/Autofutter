import { DailySummaryRepository } from '@/data/repositories/dailySummaryRepository';
import { RetentionRepository } from '@/data/repositories/retentionRepository';
import type { DatabaseConnection } from '@/data/database/types';
import { subtractLocalMonths } from '@/utils/dates';

export class RetentionService {
  constructor(private readonly database: DatabaseConnection) {}

  async runIfNeeded(today: string, timestamp: string): Promise<number> {
    const state = new RetentionRepository(this.database);
    if (await state.getLastRunDate() === today) {
      return 0;
    }

    const cutoffDate = subtractLocalMonths(today, 3);
    let deletedCount = 0;
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const retention = new RetentionRepository(transaction);
      const summaries = new DailySummaryRepository(transaction);
      const expiredDates = await retention.listExpiredLogDates(cutoffDate);
      for (const date of expiredDates) {
        await summaries.recalculate(date, timestamp);
      }
      deletedCount = await retention.deleteExpiredLogs(cutoffDate);
      await retention.setLastRunDate(today);
    });
    return deletedCount;
  }
}
