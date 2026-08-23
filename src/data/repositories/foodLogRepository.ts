import type { DatabaseConnection } from '@/data/database/types';

export type FoodLogEntryType = 'food' | 'recipe' | 'recipe_variation' | 'quick';

export type FoodLogEntryRecord = {
  id: string;
  log_date: string;
  logged_at: string;
  entry_type: FoodLogEntryType;
  source_food_id: string | null;
  source_recipe_id: string | null;
  source_variation_id: string | null;
  display_name_snapshot: string;
  amount_g: number | null;
  calories: number;
  protein_g: number | null;
  fat_g: number | null;
  carbs_g: number | null;
  sodium_mg: number | null;
  cholesterol_mg: number | null;
  is_estimated: number;
  nutrition_basis_weight_g: number | null;
  nutrition_basis_calories: number | null;
  nutrition_basis_protein_g: number | null;
  nutrition_basis_fat_g: number | null;
  nutrition_basis_carbs_g: number | null;
  nutrition_basis_sodium_mg: number | null;
  nutrition_basis_cholesterol_mg: number | null;
  created_at: string;
  updated_at: string;
};

export class FoodLogRepository {
  constructor(private readonly database: DatabaseConnection) {}

  async insert(entry: FoodLogEntryRecord): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO food_log_entries (
        id, log_date, logged_at, entry_type, source_food_id, source_recipe_id,
        source_variation_id, display_name_snapshot, amount_g, calories,
        protein_g, fat_g, carbs_g, sodium_mg, cholesterol_mg, is_estimated,
        nutrition_basis_weight_g, nutrition_basis_calories,
        nutrition_basis_protein_g, nutrition_basis_fat_g,
        nutrition_basis_carbs_g, nutrition_basis_sodium_mg,
        nutrition_basis_cholesterol_mg, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      entry.id,
      entry.log_date,
      entry.logged_at,
      entry.entry_type,
      entry.source_food_id,
      entry.source_recipe_id,
      entry.source_variation_id,
      entry.display_name_snapshot,
      entry.amount_g,
      entry.calories,
      entry.protein_g,
      entry.fat_g,
      entry.carbs_g,
      entry.sodium_mg,
      entry.cholesterol_mg,
      entry.is_estimated,
      entry.nutrition_basis_weight_g,
      entry.nutrition_basis_calories,
      entry.nutrition_basis_protein_g,
      entry.nutrition_basis_fat_g,
      entry.nutrition_basis_carbs_g,
      entry.nutrition_basis_sodium_mg,
      entry.nutrition_basis_cholesterol_mg,
      entry.created_at,
      entry.updated_at,
    );
  }

  async findById(id: string): Promise<FoodLogEntryRecord | null> {
    return this.database.getFirstAsync<FoodLogEntryRecord>(
      'SELECT * FROM food_log_entries WHERE id = ?;',
      id,
    );
  }

  async listByDate(date: string): Promise<FoodLogEntryRecord[]> {
    return this.database.getAllAsync<FoodLogEntryRecord>(
      `SELECT * FROM food_log_entries
       WHERE log_date = ?
       ORDER BY logged_at, created_at, id;`,
      date,
    );
  }

  async updateWeighedNutrition(
    id: string,
    amountG: number,
    nutrition: Readonly<{
      calories: number;
      proteinG: number;
      fatG: number;
      carbsG: number;
      sodiumMg: number;
      cholesterolMg: number;
    }>,
    updatedAt: string,
  ): Promise<void> {
    await this.database.runAsync(
      `UPDATE food_log_entries
       SET amount_g = ?, calories = ?, protein_g = ?, fat_g = ?, carbs_g = ?,
           sodium_mg = ?, cholesterol_mg = ?, updated_at = ?
       WHERE id = ?;`,
      amountG,
      nutrition.calories,
      nutrition.proteinG,
      nutrition.fatG,
      nutrition.carbsG,
      nutrition.sodiumMg,
      nutrition.cholesterolMg,
      updatedAt,
      id,
    );
  }

  async updateQuickEntry(entry: FoodLogEntryRecord): Promise<void> {
    await this.database.runAsync(
      `UPDATE food_log_entries
       SET display_name_snapshot = ?, calories = ?, protein_g = ?, fat_g = ?,
           carbs_g = ?, sodium_mg = ?, cholesterol_mg = ?, is_estimated = ?,
           updated_at = ?
       WHERE id = ? AND entry_type = 'quick';`,
      entry.display_name_snapshot,
      entry.calories,
      entry.protein_g,
      entry.fat_g,
      entry.carbs_g,
      entry.sodium_mg,
      entry.cholesterol_mg,
      entry.is_estimated,
      entry.updated_at,
      entry.id,
    );
  }

  async deleteById(id: string): Promise<void> {
    await this.database.runAsync(
      'DELETE FROM food_log_entries WHERE id = ?;',
      id,
    );
  }
}
