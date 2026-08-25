import { initializeDatabase } from '../../src/data/database/database';
import { FoodRepository } from '../../src/data/repositories/foodRepository';
import { parseBackupDocument } from '../../src/schemas/backup';
import { BackupService } from '../../src/services/backup/backupService';
import { TestDatabase } from '../database/testDatabase';

const timestamp = '2026-08-22T20:00:00.000Z';

async function seed(database: TestDatabase, foodId = 'food'): Promise<void> {
  await new FoodRepository(database).create({
    id: foodId,
    name: 'Backup Food',
    reference_weight_g: 100,
    calories: 123.45,
    protein_g: 10.5,
    fat_g: 2.25,
    carbs_g: 15.75,
    sodium_mg: 100,
    cholesterol_mg: 20,
    source_type: 'custom',
    source_id: null,
    created_at: timestamp,
    updated_at: timestamp,
    standard_portion_label: 'piece',
    standard_portion_weight_g: 28,
  });
  await database.runAsync(
    `INSERT INTO food_log_entries (
      id, log_date, logged_at, entry_type, source_food_id,
      display_name_snapshot, amount_g, calories, protein_g, fat_g, carbs_g,
      sodium_mg, cholesterol_mg, is_estimated, created_at, updated_at,
      nutrition_basis_weight_g, nutrition_basis_calories,
      nutrition_basis_protein_g, nutrition_basis_fat_g, nutrition_basis_carbs_g,
      nutrition_basis_sodium_mg, nutrition_basis_cholesterol_mg
    ) VALUES (
      'log', '2026-08-22', ?, 'food', ?, 'Backup Food', 50, 62, 6, 2, 8,
      50, 10, 0, ?, ?, 100, 123.45, 10.5, 2.25, 15.75, 100, 20
    );`,
    timestamp,
    foodId,
    timestamp,
    timestamp,
  );
  await database.runAsync(
    `INSERT INTO daily_nutrition_summaries VALUES
     ('2026-08-22', 62, 6, 2, 8, 50, 10, 0, ?);`,
    timestamp,
  );
  await database.runAsync(
    `INSERT INTO nutrition_goals VALUES
     ('goal', '2026-08-22', 2000, 160, 10, ?, ?);`,
    timestamp,
    timestamp,
  );
  await database.runAsync(
    `INSERT INTO weigh_ins VALUES ('weight', '2026-08-22', 199.5, ?, ?);`,
    timestamp,
    timestamp,
  );
  await database.runAsync(
    `INSERT INTO log_day_completions VALUES ('2026-08-22', ?);`,
    timestamp,
  );
}

describe('BackupService', () => {
  let database: TestDatabase;

  beforeEach(async () => {
    database = new TestDatabase();
    await initializeDatabase(database);
  });

  afterEach(() => database.close());

  it('serializes a versioned, complete, schema-valid portable backup file', async () => {
    await seed(database);
    const service = new BackupService(database);

    const contents = await service.createBackupContents(timestamp);

    const backup = parseBackupDocument(contents);
    expect(backup).toMatchObject({
      format: 'personal-nutrition-tracker',
      version: 2,
      createdAt: timestamp,
    });
    expect(backup.data.foods).toHaveLength(1);
    expect(backup.data.foodLogs).toHaveLength(1);
    expect(backup.data.dailyNutrition).toHaveLength(1);
    expect(backup.data.weighIns).toHaveLength(1);
    expect(backup.data.goals).toHaveLength(1);
    expect(backup.data.logDayCompletions).toHaveLength(1);
    expect(backup.data.foods[0]).toMatchObject({
      standard_portion_label: 'piece',
      standard_portion_weight_g: 28,
    });
  });

  it('rejects corrupt and incompatible backups before changing data', async () => {
    await seed(database);
    const service = new BackupService(database);

    expect(() => service.preview('{broken')).toThrow('not valid JSON');
    expect(() => service.preview(JSON.stringify({
      format: 'personal-nutrition-tracker', version: 99, createdAt: timestamp, data: {},
    }))).toThrow('version is not supported');
    expect(await database.getFirstAsync('SELECT * FROM foods WHERE id = ?;', 'food')).not.toBeNull();
  });

  it('rejects a backup with an incomplete standard portion', async () => {
    await seed(database);
    const service = new BackupService(database);
    const document = await service.createDocument(timestamp);
    const invalid = {
      ...document,
      data: {
        ...document.data,
        foods: document.data.foods.map((food) => ({
          ...food,
          standard_portion_weight_g: null,
        })),
      },
    };

    expect(() => service.preview(JSON.stringify(invalid))).toThrow(
      'incomplete or invalid',
    );
  });

  it('restores all backed-up data transactionally', async () => {
    await seed(database);
    const sourceService = new BackupService(database);
    const contents = JSON.stringify(await sourceService.createDocument(timestamp));

    const target = new TestDatabase();
    await initializeDatabase(target);
    const targetService = new BackupService(target);
    await expect(targetService.restore(contents)).resolves.toMatchObject({
      foods: 1,
      detailedLogEntries: 1,
      dailySummaries: 1,
      weighIns: 1,
    });
    expect(await target.getFirstAsync('SELECT * FROM foods WHERE id = ?;', 'food')).not.toBeNull();
    expect(await target.getFirstAsync('SELECT * FROM foods WHERE id = ?;', 'food')).toMatchObject({
      standard_portion_label: 'piece',
      standard_portion_weight_g: 28,
    });
    expect(await target.getFirstAsync('SELECT * FROM food_log_entries WHERE id = ?;', 'log')).not.toBeNull();
    expect(await target.getFirstAsync('SELECT * FROM log_day_completions WHERE date = ?;', '2026-08-22')).not.toBeNull();
    target.close();
  });

  it('upgrades a version 1 backup with foods that have no standard portion', async () => {
    await seed(database);
    const current = await new BackupService(database).createDocument(timestamp);
    const legacyFoods = current.data.foods.map((food) => {
      const {
        standard_portion_label: _label,
        standard_portion_weight_g: _weight,
        ...legacyFood
      } = food;
      return legacyFood;
    });
    const legacy = {
      ...current,
      version: 1,
      data: { ...current.data, foods: legacyFoods },
    };

    const parsed = parseBackupDocument(JSON.stringify(legacy));
    expect(parsed.version).toBe(2);
    expect(parsed.data.foods[0]).toMatchObject({
      standard_portion_label: null,
      standard_portion_weight_g: null,
    });
  });

  it('rolls back a failed restore and preserves the current database', async () => {
    await seed(database);
    const document = await new BackupService(database).createDocument(timestamp);
    const target = new TestDatabase();
    await initializeDatabase(target);
    await seed(target, 'existing-food');
    const runAsync = target.runAsync.bind(target);
    jest.spyOn(target, 'runAsync').mockImplementation(async (source, ...params) => {
      if (source.includes('INSERT INTO foods')) {
        throw new Error('forced restore failure');
      }
      return runAsync(source, ...params);
    });

    await expect(
      new BackupService(target).restore(JSON.stringify(document)),
    ).rejects.toThrow();
    expect(await target.getFirstAsync('SELECT * FROM foods WHERE id = ?;', 'existing-food')).not.toBeNull();
    expect(await target.getFirstAsync('SELECT * FROM food_log_entries WHERE id = ?;', 'log')).toMatchObject({
      source_food_id: 'existing-food',
    });
    target.close();
  });
});
