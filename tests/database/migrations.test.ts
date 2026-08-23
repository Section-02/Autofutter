import { initializeDatabase } from '../../src/data/database/database';
import { runMigrations } from '../../src/data/database/migrationRunner';
import { TestDatabase } from './testDatabase';

describe('database migrations', () => {
  let database: TestDatabase;

  beforeEach(() => {
    database = new TestDatabase();
  });

  afterEach(() => {
    database.close();
  });

  it('creates the complete initial schema and records its version', async () => {
    await initializeDatabase(database);

    const tables = await database.getAllAsync<{ name: string }>(
      `SELECT name FROM sqlite_master
       WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
       ORDER BY name;`,
    );
    const version = await database.getFirstAsync<{ version: number }>(
      'SELECT MAX(version) AS version FROM schema_migrations;',
    );

    expect(tables.map(({ name }) => name)).toEqual([
      'daily_nutrition_summaries',
      'food_log_entries',
      'foods',
      'nutrition_goals',
      'recipe_ingredients',
      'recipe_variation_overrides',
      'recipe_variations',
      'recipes',
      'schema_migrations',
      'weigh_ins',
    ]);
    expect(version?.version).toBe(3);
  });

  it('is idempotent after the latest migration has been applied', async () => {
    await initializeDatabase(database);
    await runMigrations(database);

    const rows = await database.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM schema_migrations;',
    );

    expect(rows?.count).toBe(3);
  });

  it('rolls back a failed migration without recording its version', async () => {
    await expect(
      runMigrations(database, [
        {
          version: 1,
          name: 'failing_migration',
          async up(transaction) {
            await transaction.execAsync('CREATE TABLE should_be_rolled_back (id TEXT);');
            throw new Error('migration failed');
          },
        },
      ]),
    ).rejects.toThrow('migration failed');

    const table = await database.getFirstAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'should_be_rolled_back';",
    );
    const rows = await database.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM schema_migrations;',
    );

    expect(table).toBeNull();
    expect(rows?.count).toBe(0);
  });

  it('enforces foreign keys', async () => {
    await initializeDatabase(database);

    const foreignKeys = await database.getFirstAsync<{ foreign_keys: number }>(
      'PRAGMA foreign_keys;',
    );
    expect(foreignKeys?.foreign_keys).toBe(1);

    const definitions = await database.getAllAsync<{ table: string }>(
      'PRAGMA foreign_key_list(recipe_ingredients);',
    );
    expect(definitions.map(({ table }) => table).sort()).toEqual([
      'foods',
      'recipes',
    ]);
  });
});
