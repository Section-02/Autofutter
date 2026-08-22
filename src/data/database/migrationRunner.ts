import { migrations, type Migration } from './migrations';
import type { DatabaseConnection } from './types';

type MigrationVersionRow = {
  version: number;
};

export async function runMigrations(
  database: DatabaseConnection,
  orderedMigrations: readonly Migration[] = migrations,
): Promise<void> {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const current = await database.getFirstAsync<MigrationVersionRow>(
    'SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations;',
  );
  const currentVersion = current?.version ?? 0;
  const pending = orderedMigrations
    .filter((migration) => migration.version > currentVersion)
    .sort((left, right) => left.version - right.version);

  for (const migration of pending) {
    await database.withExclusiveTransactionAsync(async (transaction) => {
      await migration.up(transaction);
      await transaction.runAsync(
        'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?);',
        migration.version,
        migration.name,
        new Date().toISOString(),
      );
    });
  }
}
