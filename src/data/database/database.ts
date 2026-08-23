import type { SQLiteDatabase } from 'expo-sqlite';

import { runMigrations } from './migrationRunner';
import type { DatabaseBindValue, DatabaseConnection } from './types';

type MutationListener = () => void | Promise<void>;

const MUTATION_PATTERN = /^\s*(?:INSERT|UPDATE|DELETE|REPLACE)\b/i;
const INTERNAL_STATE_PATTERN = /\b(?:backup_state|retention_state|schema_migrations)\b/i;

function changesBackedUpData(source: string): boolean {
  return MUTATION_PATTERN.test(source) && !INTERNAL_STATE_PATTERN.test(source);
}

export function adaptExpoDatabase(
  database: SQLiteDatabase,
  onMutation?: MutationListener,
): DatabaseConnection {
  const notifyMutation = (): void => {
    if (onMutation) {
      void Promise.resolve(onMutation()).catch(() => undefined);
    }
  };

  return {
    execAsync: (source) => database.execAsync(source),
    runAsync: async (source, ...params) => {
      const result = await database.runAsync(source, ...params);
      if (changesBackedUpData(source)) {
        notifyMutation();
      }
      return result;
    },
    getFirstAsync: <T>(source: string, ...params: DatabaseBindValue[]) =>
      database.getFirstAsync<T>(source, ...params),
    getAllAsync: <T>(source: string, ...params: DatabaseBindValue[]) =>
      database.getAllAsync<T>(source, ...params),
    withExclusiveTransactionAsync: async (task) => {
      let transactionChangedData = false;
      await database.withExclusiveTransactionAsync(async (transaction) => {
        await task(adaptExpoDatabase(transaction, () => {
          transactionChangedData = true;
        }));
      });
      if (transactionChangedData) {
        notifyMutation();
      }
    },
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
