import type { DatabaseConnection } from '@/data/database/types';

export class DataResetRepository {
  constructor(private readonly database: DatabaseConnection) {}

  async eraseAllUserData(): Promise<void> {
    await this.database.execAsync(`
      DELETE FROM food_log_entries;
      DELETE FROM recipe_variation_overrides;
      DELETE FROM recipe_variations;
      DELETE FROM recipe_ingredients;
      DELETE FROM recipes;
      DELETE FROM foods;
      DELETE FROM daily_nutrition_summaries;
      DELETE FROM nutrition_goals;
      DELETE FROM weigh_ins;
      DELETE FROM log_day_completions;
      UPDATE retention_state SET last_run_date = NULL WHERE id = 1;
      UPDATE app_preferences SET measurement_system = 'grams' WHERE id = 1;
    `);
  }
}
