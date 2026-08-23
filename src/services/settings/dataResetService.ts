import type { DatabaseConnection } from '@/data/database/types';
import { DataResetRepository } from '@/data/repositories/dataResetRepository';

export class DataResetService {
  constructor(private readonly database: DatabaseConnection) {}

  async eraseAllData(): Promise<void> {
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      await new DataResetRepository(transaction).eraseAllUserData();
    });
  }
}
