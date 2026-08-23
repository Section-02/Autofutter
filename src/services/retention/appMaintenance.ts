import type { DatabaseConnection } from '@/data/database/types';
import { todayLocalDate } from '@/utils/dates';

import { RetentionService } from './retentionService';

let database: DatabaseConnection | null = null;
let running: Promise<void> | null = null;

export function configureAppMaintenance(connection: DatabaseConnection): void {
  database = connection;
}

export function runAppMaintenance(): Promise<void> {
  if (!database) return Promise.resolve();
  if (running) return running;
  const connection = database;
  running = (async () => {
    await new RetentionService(connection).runIfNeeded(
      todayLocalDate(),
      new Date().toISOString(),
    );
  })().finally(() => {
    running = null;
  });
  return running;
}
