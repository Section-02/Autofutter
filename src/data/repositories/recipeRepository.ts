import type { DatabaseConnection } from '@/data/database/types';

export type RecipeRecord = {
  id: string;
  name: string;
  finished_weight_g: number | null;
  use_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type RecipeIngredientNutritionRecord = {
  id: string;
  food_id: string;
  weight_g: number;
  sort_order: number;
  reference_weight_g: number;
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  sodium_mg: number;
  cholesterol_mg: number;
};

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

export class RecipeRepository {
  constructor(private readonly database: DatabaseConnection) {}

  async findById(id: string): Promise<RecipeRecord | null> {
    return this.database.getFirstAsync<RecipeRecord>(
      'SELECT * FROM recipes WHERE id = ?;',
      id,
    );
  }

  async listIngredients(recipeId: string): Promise<RecipeIngredientNutritionRecord[]> {
    return this.database.getAllAsync<RecipeIngredientNutritionRecord>(
      `SELECT
         ri.id, ri.food_id, ri.weight_g, ri.sort_order,
         f.reference_weight_g, f.calories, f.protein_g, f.fat_g,
         f.carbs_g, f.sodium_mg, f.cholesterol_mg
       FROM recipe_ingredients ri
       JOIN foods f ON f.id = ri.food_id
       WHERE ri.recipe_id = ?
       ORDER BY ri.sort_order, ri.id;`,
      recipeId,
    );
  }

  async searchLoggable(query: string, limit = 30): Promise<RecipeRecord[]> {
    return this.database.getAllAsync<RecipeRecord>(
      `SELECT r.* FROM recipes r
       WHERE r.deleted_at IS NULL
         AND r.finished_weight_g > 0
         AND r.name LIKE ? ESCAPE '\\' COLLATE NOCASE
         AND EXISTS (SELECT 1 FROM recipe_ingredients ri WHERE ri.recipe_id = r.id)
       ORDER BY r.name COLLATE NOCASE
       LIMIT ?;`,
      `%${escapeLike(query.trim())}%`,
      limit,
    );
  }

  async listRecentLoggable(limit = 8): Promise<RecipeRecord[]> {
    return this.database.getAllAsync<RecipeRecord>(
      `SELECT r.* FROM recipes r
       WHERE r.deleted_at IS NULL
         AND r.finished_weight_g > 0
         AND r.last_used_at IS NOT NULL
         AND EXISTS (SELECT 1 FROM recipe_ingredients ri WHERE ri.recipe_id = r.id)
       ORDER BY r.last_used_at DESC, r.use_count DESC, r.name COLLATE NOCASE
       LIMIT ?;`,
      limit,
    );
  }

  async updateUsage(id: string, usedAt: string): Promise<void> {
    await this.database.runAsync(
      `UPDATE recipes
       SET use_count = use_count + 1, last_used_at = ?, updated_at = ?
       WHERE id = ?;`,
      usedAt,
      usedAt,
      id,
    );
  }
}
