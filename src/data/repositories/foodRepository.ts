import type { DatabaseConnection } from '@/data/database/types';

export type FoodRecord = {
  id: string;
  name: string;
  reference_weight_g: number;
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  sodium_mg: number;
  cholesterol_mg: number;
  source_type: string;
  source_id: string | null;
  use_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  standard_portion_label: string | null;
  standard_portion_weight_g: number | null;
};

export type NewFoodRecord = Omit<
  FoodRecord,
  'use_count' | 'last_used_at' | 'deleted_at'
>;

export type FoodSort = 'most_used' | 'recently_used' | 'name' | 'recently_added';

export type FoodUpdate = Pick<
  FoodRecord,
  | 'name'
  | 'reference_weight_g'
  | 'calories'
  | 'protein_g'
  | 'fat_g'
  | 'carbs_g'
  | 'sodium_mg'
  | 'cholesterol_mg'
  | 'standard_portion_label'
  | 'standard_portion_weight_g'
  | 'updated_at'
>;

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

export class FoodRepository {
  constructor(private readonly database: DatabaseConnection) {}

  async create(food: NewFoodRecord): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO foods (
        id, name, reference_weight_g, calories, protein_g, fat_g, carbs_g,
        sodium_mg, cholesterol_mg, source_type, source_id, created_at, updated_at,
        standard_portion_label, standard_portion_weight_g
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      food.id,
      food.name,
      food.reference_weight_g,
      food.calories,
      food.protein_g,
      food.fat_g,
      food.carbs_g,
      food.sodium_mg,
      food.cholesterol_mg,
      food.source_type,
      food.source_id,
      food.created_at,
      food.updated_at,
      food.standard_portion_label,
      food.standard_portion_weight_g,
    );
  }

  async findById(id: string): Promise<FoodRecord | null> {
    return this.database.getFirstAsync<FoodRecord>(
      'SELECT * FROM foods WHERE id = ?;',
      id,
    );
  }

  async listActive(
    query: string,
    sort: FoodSort = 'most_used',
    limit = 200,
  ): Promise<FoodRecord[]> {
    const orderBy: Record<FoodSort, string> = {
      most_used: 'use_count DESC, last_used_at DESC, name COLLATE NOCASE',
      recently_used:
        'CASE WHEN last_used_at IS NULL THEN 1 ELSE 0 END, last_used_at DESC, name COLLATE NOCASE',
      name: 'name COLLATE NOCASE',
      recently_added: 'created_at DESC, name COLLATE NOCASE',
    };

    return this.database.getAllAsync<FoodRecord>(
      `SELECT * FROM foods
       WHERE deleted_at IS NULL AND name LIKE ? ESCAPE '\\' COLLATE NOCASE
       ORDER BY ${orderBy[sort]}
       LIMIT ?;`,
      `%${escapeLike(query.trim())}%`,
      limit,
    );
  }

  async searchActive(query: string, limit = 30): Promise<FoodRecord[]> {
    return this.database.getAllAsync<FoodRecord>(
      `SELECT * FROM foods
       WHERE deleted_at IS NULL AND name LIKE ? ESCAPE '\\' COLLATE NOCASE
       ORDER BY name COLLATE NOCASE
       LIMIT ?;`,
      `%${escapeLike(query.trim())}%`,
      limit,
    );
  }

  async listRecent(limit = 8): Promise<FoodRecord[]> {
    return this.database.getAllAsync<FoodRecord>(
      `SELECT * FROM foods
       WHERE deleted_at IS NULL AND last_used_at IS NOT NULL
       ORDER BY last_used_at DESC, use_count DESC, name COLLATE NOCASE
       LIMIT ?;`,
      limit,
    );
  }

  async updateUsage(id: string, usedAt: string): Promise<void> {
    await this.database.runAsync(
      `UPDATE foods
       SET use_count = use_count + 1, last_used_at = ?, updated_at = ?
       WHERE id = ?;`,
      usedAt,
      usedAt,
      id,
    );
  }

  async update(id: string, food: FoodUpdate): Promise<void> {
    await this.database.runAsync(
      `UPDATE foods SET
        name = ?, reference_weight_g = ?, calories = ?, protein_g = ?,
        fat_g = ?, carbs_g = ?, sodium_mg = ?, cholesterol_mg = ?,
        standard_portion_label = ?, standard_portion_weight_g = ?, updated_at = ?
       WHERE id = ? AND deleted_at IS NULL;`,
      food.name,
      food.reference_weight_g,
      food.calories,
      food.protein_g,
      food.fat_g,
      food.carbs_g,
      food.sodium_mg,
      food.cholesterol_mg,
      food.standard_portion_label,
      food.standard_portion_weight_g,
      food.updated_at,
      id,
    );
  }

  async listDeleted(): Promise<FoodRecord[]> {
    return this.database.getAllAsync<FoodRecord>(
      `SELECT * FROM foods
       WHERE deleted_at IS NOT NULL
       ORDER BY deleted_at DESC, name COLLATE NOCASE;`,
    );
  }

  async listActiveRecipeReferences(id: string): Promise<string[]> {
    const rows = await this.database.getAllAsync<{ name: string }>(
      `SELECT DISTINCT recipes.name
       FROM recipe_ingredients
       JOIN recipes ON recipes.id = recipe_ingredients.recipe_id
       WHERE recipe_ingredients.food_id = ? AND recipes.deleted_at IS NULL
       UNION
       SELECT DISTINCT recipes.name
       FROM recipe_variation_overrides
       JOIN recipe_variations
         ON recipe_variations.id = recipe_variation_overrides.variation_id
       JOIN recipes ON recipes.id = recipe_variations.recipe_id
       WHERE recipe_variation_overrides.food_id = ?
         AND recipe_variations.deleted_at IS NULL
         AND recipes.deleted_at IS NULL
       ORDER BY name COLLATE NOCASE;`,
      id,
      id,
    );
    return rows.map(({ name }) => name);
  }

  async listAllRecipeReferences(id: string): Promise<string[]> {
    const rows = await this.database.getAllAsync<{ name: string }>(
      `SELECT DISTINCT recipes.name
       FROM recipe_ingredients
       JOIN recipes ON recipes.id = recipe_ingredients.recipe_id
       WHERE recipe_ingredients.food_id = ?
       UNION
       SELECT DISTINCT recipes.name
       FROM recipe_variation_overrides
       JOIN recipe_variations ON recipe_variations.id = recipe_variation_overrides.variation_id
       JOIN recipes ON recipes.id = recipe_variations.recipe_id
       WHERE recipe_variation_overrides.food_id = ?
       ORDER BY name COLLATE NOCASE;`,
      id, id,
    );
    return rows.map(({ name }) => name);
  }

  async hardDelete(id: string): Promise<void> {
    await this.database.runAsync('DELETE FROM foods WHERE id = ? AND deleted_at IS NOT NULL;', id);
  }

  async softDelete(id: string, deletedAt: string): Promise<void> {
    await this.database.runAsync(
      `UPDATE foods
       SET deleted_at = ?, updated_at = ?
       WHERE id = ? AND deleted_at IS NULL;`,
      deletedAt,
      deletedAt,
      id,
    );
  }

  async restore(id: string, restoredAt: string): Promise<void> {
    await this.database.runAsync(
      `UPDATE foods
       SET deleted_at = NULL, updated_at = ?
       WHERE id = ? AND deleted_at IS NOT NULL;`,
      restoredAt,
      id,
    );
  }
}
