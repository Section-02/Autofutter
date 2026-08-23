import type { SQLiteDatabase } from 'expo-sqlite';

import { runMigrations } from './migrationRunner';
import type { DatabaseBindValue, DatabaseConnection } from './types';

export function adaptExpoDatabase(database: SQLiteDatabase): DatabaseConnection {
  return {
    execAsync: (source) => database.execAsync(source),
    runAsync: (source, ...params) => database.runAsync(source, ...params),
    getFirstAsync: <T>(source: string, ...params: DatabaseBindValue[]) =>
      database.getFirstAsync<T>(source, ...params),
    getAllAsync: <T>(source: string, ...params: DatabaseBindValue[]) =>
      database.getAllAsync<T>(source, ...params),
    withExclusiveTransactionAsync: (task) =>
      database.withExclusiveTransactionAsync(async (transaction) => {
        await task(adaptExpoDatabase(transaction));
      }),
  };
}

export async function initializeDatabase(database: DatabaseConnection): Promise<void> {
  await database.execAsync('PRAGMA journal_mode = WAL;');
  await database.execAsync('PRAGMA foreign_keys = ON;');
  await runMigrations(database);
}

export async function initializeExpoDatabase(database: SQLiteDatabase): Promise<void> {
  await initializeDatabase(adaptExpoDatabase(database));
}
