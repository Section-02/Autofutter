import type { DatabaseConnection } from '../types';

export const partialNutritionTotalsMigration = {
  version: 3,
  name: 'partial_nutrition_totals',
  async up(database: DatabaseConnection): Promise<void> {
    await database.execAsync(`
      UPDATE daily_nutrition_summaries
      SET protein_g = CASE WHEN EXISTS (
            SELECT 1 FROM food_log_entries WHERE log_date = daily_nutrition_summaries.date
          ) THEN (
            SELECT SUM(protein_g) FROM food_log_entries WHERE log_date = daily_nutrition_summaries.date
          ) ELSE 0 END,
          fat_g = CASE WHEN EXISTS (
            SELECT 1 FROM food_log_entries WHERE log_date = daily_nutrition_summaries.date
          ) THEN (
            SELECT SUM(fat_g) FROM food_log_entries WHERE log_date = daily_nutrition_summaries.date
          ) ELSE 0 END,
          carbs_g = CASE WHEN EXISTS (
            SELECT 1 FROM food_log_entries WHERE log_date = daily_nutrition_summaries.date
          ) THEN (
            SELECT SUM(carbs_g) FROM food_log_entries WHERE log_date = daily_nutrition_summaries.date
          ) ELSE 0 END,
          sodium_mg = CASE WHEN EXISTS (
            SELECT 1 FROM food_log_entries WHERE log_date = daily_nutrition_summaries.date
          ) THEN (
            SELECT SUM(sodium_mg) FROM food_log_entries WHERE log_date = daily_nutrition_summaries.date
          ) ELSE 0 END,
          cholesterol_mg = CASE WHEN EXISTS (
            SELECT 1 FROM food_log_entries WHERE log_date = daily_nutrition_summaries.date
          ) THEN (
            SELECT SUM(cholesterol_mg) FROM food_log_entries WHERE log_date = daily_nutrition_summaries.date
          ) ELSE 0 END,
          has_partial_nutrition = CASE WHEN EXISTS (
            SELECT 1 FROM food_log_entries
            WHERE log_date = daily_nutrition_summaries.date
              AND (protein_g IS NULL OR fat_g IS NULL OR carbs_g IS NULL
                OR sodium_mg IS NULL OR cholesterol_mg IS NULL)
          ) THEN 1 ELSE 0 END;
    `);
  },
} as const;
