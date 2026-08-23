import type { DatabaseConnection } from '@/data/database/types';
import { backupRuntime } from '@/services/backup/backupRuntime';
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
    const deleted = await new RetentionService(connection).runIfNeeded(
      todayLocalDate(),
      new Date().toISOString(),
    );
    if (deleted > 0) {
      await backupRuntime.markDirty();
    }
  })().finally(() => {
    running = null;
  });
  return running;
}
