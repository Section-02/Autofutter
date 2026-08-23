import { initializeDatabase } from '../../src/data/database/database';
import { DailySummaryRepository } from '../../src/data/repositories/dailySummaryRepository';
import { RetentionService } from '../../src/services/retention/retentionService';
import { TestDatabase } from '../database/testDatabase';

const now = '2026-08-22T20:00:00.000Z';

async function insertLog(
  database: TestDatabase,
  id: string,
  date: string,
  calories: number,
): Promise<void> {
  await database.runAsync(
    `INSERT INTO food_log_entries (
      id, log_date, logged_at, entry_type, display_name_snapshot,
      calories, protein_g, fat_g, carbs_g, sodium_mg, cholesterol_mg,
      is_estimated, created_at, updated_at
    ) VALUES (?, ?, ?, 'quick', 'Test entry', ?, 10, 5, 20, 100, 12, 0, ?, ?);`,
    id,
    date,
    `${date}T12:00:00.000Z`,
    calories,
    now,
    now,
  );
}

describe('RetentionService', () => {
  let database: TestDatabase;

  beforeEach(async () => {
    database = new TestDatabase();
    await initializeDatabase(database);
  });

  afterEach(() => database.close());

  it('recalculates permanent summaries before purging details older than three months', async () => {
    await insertLog(database, 'expired-1', '2026-05-21', 301);
    await insertLog(database, 'expired-2', '2026-05-21', 202);
    await insertLog(database, 'cutoff', '2026-05-22', 400);
    await insertLog(database, 'current', '2026-08-22', 500);
    await database.runAsync(
      `INSERT INTO daily_nutrition_summaries
       VALUES ('2026-05-21', 1, 1, 1, 1, 1, 1, 0, ?);`,
      now,
    );
    await database.runAsync(
      `INSERT INTO nutrition_goals VALUES
       ('goal', '2026-01-01', 2000, 160, 10, ?, ?);`,
      now,
      now,
    );
    await database.runAsync(
      `INSERT INTO weigh_ins VALUES ('weight', '2026-05-21', 200, ?, ?);`,
      now,
      now,
    );

    const deleted = await new RetentionService(database).runIfNeeded(
      '2026-08-22',
      now,
    );

    expect(deleted).toBe(2);
    expect(await database.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM food_log_entries WHERE log_date = '2026-05-21';",
    )).toEqual({ count: 0 });
    expect(await database.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM food_log_entries WHERE log_date >= '2026-05-22';",
    )).toEqual({ count: 2 });
    expect(await new DailySummaryRepository(database).findByDate('2026-05-21')).toMatchObject({
      calories: 503,
      protein_g: 20,
      fat_g: 10,
      carbs_g: 40,
      sodium_mg: 200,
      cholesterol_mg: 24,
    });
    expect(await database.getFirstAsync('SELECT * FROM nutrition_goals WHERE id = ?;', 'goal')).not.toBeNull();
    expect(await database.getFirstAsync('SELECT * FROM weigh_ins WHERE id = ?;', 'weight')).not.toBeNull();
  });

  it('runs at most once per calendar day', async () => {
    const service = new RetentionService(database);
    await service.runIfNeeded('2026-08-22', now);
    await insertLog(database, 'late-expired', '2026-01-01', 100);

    await expect(service.runIfNeeded('2026-08-22', now)).resolves.toBe(0);
    expect(await database.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM food_log_entries WHERE id = 'late-expired';",
    )).toEqual({ count: 1 });
  });
});
