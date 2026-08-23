import type { DatabaseConnection } from '@/data/database/types';

export type DailySummaryRecord = {
  date: string;
  calories: number;
  protein_g: number | null;
  fat_g: number | null;
  carbs_g: number | null;
  sodium_mg: number | null;
  cholesterol_mg: number | null;
  has_partial_nutrition: number;
  updated_at: string;
};

export class DailySummaryRepository {
  constructor(private readonly database: DatabaseConnection) {}

  async findByDate(date: string): Promise<DailySummaryRecord | null> {
    return this.database.getFirstAsync<DailySummaryRecord>(
      'SELECT * FROM daily_nutrition_summaries WHERE date = ?;',
      date,
    );
  }

  async listBetween(startDate: string | null, endDate: string): Promise<DailySummaryRecord[]> {
    if (startDate === null) {
      return this.database.getAllAsync<DailySummaryRecord>(
        'SELECT * FROM daily_nutrition_summaries WHERE date <= ? ORDER BY date ASC;',
        endDate,
      );
    }
    return this.database.getAllAsync<DailySummaryRecord>(
      `SELECT * FROM daily_nutrition_summaries
       WHERE date >= ? AND date <= ? ORDER BY date ASC;`,
      startDate,
      endDate,
    );
  }

  async recalculate(date: string, updatedAt: string): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO daily_nutrition_summaries (
         date, calories, protein_g, fat_g, carbs_g, sodium_mg,
         cholesterol_mg, has_partial_nutrition, updated_at
       )
       SELECT
         ?, COALESCE(SUM(calories), 0),
         CASE WHEN COUNT(*) = 0 THEN 0 ELSE SUM(protein_g) END,
         CASE WHEN COUNT(*) = 0 THEN 0 ELSE SUM(fat_g) END,
         CASE WHEN COUNT(*) = 0 THEN 0 ELSE SUM(carbs_g) END,
         CASE WHEN COUNT(*) = 0 THEN 0 ELSE SUM(sodium_mg) END,
         CASE WHEN COUNT(*) = 0 THEN 0 ELSE SUM(cholesterol_mg) END,
         CASE WHEN COUNT(*) = COUNT(protein_g)
                   AND COUNT(*) = COUNT(fat_g)
                   AND COUNT(*) = COUNT(carbs_g)
                   AND COUNT(*) = COUNT(sodium_mg)
                   AND COUNT(*) = COUNT(cholesterol_mg)
              THEN 0 ELSE 1 END,
         ?
       FROM food_log_entries
       WHERE log_date = ?
       ON CONFLICT(date) DO UPDATE SET
         calories = excluded.calories,
         protein_g = excluded.protein_g,
         fat_g = excluded.fat_g,
         carbs_g = excluded.carbs_g,
         sodium_mg = excluded.sodium_mg,
         cholesterol_mg = excluded.cholesterol_mg,
         has_partial_nutrition = excluded.has_partial_nutrition,
         updated_at = excluded.updated_at;`,
      date,
      updatedAt,
      date,
    );
  }
}
