import { initializeDatabase } from '../../src/data/database/database';
import { DataResetService } from '../../src/services/settings/dataResetService';
import { TestDatabase } from '../database/testDatabase';

const userTables = [
  'food_log_entries',
  'recipe_variation_overrides',
  'recipe_variations',
  'recipe_ingredients',
  'recipes',
  'foods',
  'daily_nutrition_summaries',
  'nutrition_goals',
  'weigh_ins',
  'log_day_completions',
] as const;

describe('DataResetService', () => {
  let database: TestDatabase;

  beforeEach(async () => {
    database = new TestDatabase();
    await initializeDatabase(database);
  });

  afterEach(() => database.close());

  it('transactionally erases every user-data table while preserving the schema', async () => {
    await database.execAsync(`
      INSERT INTO foods (
        id, name, reference_weight_g, calories, protein_g, fat_g, carbs_g,
        sodium_mg, cholesterol_mg, source_type, created_at, updated_at
      ) VALUES ('food', 'Food', 100, 100, 1, 1, 1, 1, 1, 'manual', 'now', 'now');
      INSERT INTO recipes (id, name, finished_weight_g, created_at, updated_at)
        VALUES ('recipe', 'Recipe', 100, 'now', 'now');
      INSERT INTO recipe_ingredients (
        id, recipe_id, food_id, weight_g, sort_order, created_at, updated_at
      ) VALUES ('ingredient', 'recipe', 'food', 100, 0, 'now', 'now');
      INSERT INTO recipe_variations (
        id, recipe_id, name, finished_weight_g, created_at, updated_at
      ) VALUES ('variation', 'recipe', 'Variation', 100, 'now', 'now');
      INSERT INTO recipe_variation_overrides (
        id, variation_id, action, base_recipe_ingredient_id, weight_g,
        created_at, updated_at
      ) VALUES ('override', 'variation', 'change_weight', 'ingredient', 90, 'now', 'now');
      INSERT INTO food_log_entries (
        id, log_date, logged_at, entry_type, source_food_id,
        display_name_snapshot, amount_g, calories, is_estimated, created_at, updated_at
      ) VALUES ('log', '2026-08-22', 'now', 'food', 'food', 'Food', 100, 100, 0, 'now', 'now');
      INSERT INTO daily_nutrition_summaries (
        date, calories, protein_g, fat_g, carbs_g, sodium_mg, cholesterol_mg,
        has_partial_nutrition, updated_at
      ) VALUES ('2026-08-22', 100, 1, 1, 1, 1, 1, 0, 'now');
      INSERT INTO nutrition_goals (
        id, effective_date, calorie_target, protein_minimum_g,
        calorie_tolerance_percent, created_at, updated_at
      ) VALUES ('goal', '2026-08-22', 2000, 160, 10, 'now', 'now');
      INSERT INTO weigh_ins (id, date, weight_lb, created_at, updated_at)
        VALUES ('weight', '2026-08-22', 200, 'now', 'now');
      INSERT INTO log_day_completions (date, ended_at)
        VALUES ('2026-08-22', 'now');
      UPDATE retention_state SET last_run_date = '2026-08-22' WHERE id = 1;
    `);

    await new DataResetService(database).eraseAllData();

    for (const table of userTables) {
      const row = await database.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) AS count FROM ${table};`,
      );
      expect(row?.count).toBe(0);
    }
    await expect(database.getFirstAsync(
      'SELECT last_run_date FROM retention_state WHERE id = 1;',
    )).resolves.toEqual({ last_run_date: null });
    await expect(database.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM schema_migrations;',
    )).resolves.toEqual({ count: 6 });
  });
});
