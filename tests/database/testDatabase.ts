import BetterSqlite3, { type Database } from 'better-sqlite3';

import type {
  DatabaseBindValue,
  DatabaseConnection,
} from '../../src/data/database/types';

export class TestDatabase implements DatabaseConnection {
  private readonly database: Database;

  constructor() {
    this.database = new BetterSqlite3(':memory:');
  }

  async execAsync(source: string): Promise<void> {
    this.database.exec(source);
  }

  async runAsync(source: string, ...params: DatabaseBindValue[]): Promise<unknown> {
    return this.database.prepare(source).run(...params);
  }

  async getFirstAsync<T>(source: string, ...params: DatabaseBindValue[]): Promise<T | null> {
    const row = this.database.prepare(source).get(...params) as T | undefined;
    return row ?? null;
  }

  async getAllAsync<T>(source: string, ...params: DatabaseBindValue[]): Promise<T[]> {
    return this.database.prepare(source).all(...params) as T[];
  }

  async withExclusiveTransactionAsync(
    task: (transaction: DatabaseConnection) => Promise<void>,
  ): Promise<void> {
    this.database.exec('BEGIN EXCLUSIVE;');
    try {
      await task(this);
      this.database.exec('COMMIT;');
    } catch (error: unknown) {
      this.database.exec('ROLLBACK;');
      throw error;
    }
  }

  close(): void {
    this.database.close();
  }
}
