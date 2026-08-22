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

export type RecipeSort = 'most_used' | 'recently_used' | 'name' | 'recently_added';

export type RecipeIngredientNutritionRecord = {
  id: string;
  recipe_id: string;
  food_id: string;
  food_name: string;
  food_deleted_at: string | null;
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

export type RecipeVariationRecord = {
  id: string;
  recipe_id: string;
  name: string;
  finished_weight_g: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type VariationOverrideAction =
  | 'replace'
  | 'remove'
  | 'add'
  | 'change_weight';

export type RecipeVariationOverrideRecord = {
  id: string;
  variation_id: string;
  action: VariationOverrideAction;
  base_recipe_ingredient_id: string | null;
  food_id: string | null;
  food_name: string | null;
  food_deleted_at: string | null;
  weight_g: number | null;
  created_at: string;
  updated_at: string;
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

  async listActive(
    query: string,
    sort: RecipeSort = 'most_used',
    limit = 200,
  ): Promise<RecipeRecord[]> {
    const orderBy: Record<RecipeSort, string> = {
      most_used: 'use_count DESC, last_used_at DESC, name COLLATE NOCASE',
      recently_used:
        'CASE WHEN last_used_at IS NULL THEN 1 ELSE 0 END, last_used_at DESC, name COLLATE NOCASE',
      name: 'name COLLATE NOCASE',
      recently_added: 'created_at DESC, name COLLATE NOCASE',
    };
    return this.database.getAllAsync<RecipeRecord>(
      `SELECT * FROM recipes
       WHERE deleted_at IS NULL AND name LIKE ? ESCAPE '\\' COLLATE NOCASE
       ORDER BY ${orderBy[sort]}
       LIMIT ?;`,
      `%${escapeLike(query.trim())}%`,
      limit,
    );
  }

  async listDeleted(): Promise<RecipeRecord[]> {
    return this.database.getAllAsync<RecipeRecord>(
      `SELECT * FROM recipes
       WHERE deleted_at IS NOT NULL
       ORDER BY deleted_at DESC, name COLLATE NOCASE;`,
    );
  }

  async create(recipe: Omit<RecipeRecord, 'use_count' | 'last_used_at' | 'deleted_at'>): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO recipes (
        id, name, finished_weight_g, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?);`,
      recipe.id,
      recipe.name,
      recipe.finished_weight_g,
      recipe.created_at,
      recipe.updated_at,
    );
  }

  async update(
    id: string,
    name: string,
    finishedWeightG: number | null,
    updatedAt: string,
  ): Promise<void> {
    await this.database.runAsync(
      `UPDATE recipes
       SET name = ?, finished_weight_g = ?, updated_at = ?
       WHERE id = ? AND deleted_at IS NULL;`,
      name,
      finishedWeightG,
      updatedAt,
      id,
    );
  }

  async listIngredients(recipeId: string): Promise<RecipeIngredientNutritionRecord[]> {
    return this.database.getAllAsync<RecipeIngredientNutritionRecord>(
      `SELECT
         ri.id, ri.recipe_id, ri.food_id, f.name AS food_name,
         f.deleted_at AS food_deleted_at, ri.weight_g, ri.sort_order,
         f.reference_weight_g, f.calories, f.protein_g, f.fat_g,
         f.carbs_g, f.sodium_mg, f.cholesterol_mg
       FROM recipe_ingredients ri
       JOIN foods f ON f.id = ri.food_id
       WHERE ri.recipe_id = ?
       ORDER BY ri.sort_order, ri.id;`,
      recipeId,
    );
  }

  async insertIngredient(input: {
    id: string;
    recipeId: string;
    foodId: string;
    weightG: number;
    sortOrder: number;
    timestamp: string;
  }): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO recipe_ingredients (
        id, recipe_id, food_id, weight_g, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
      input.id,
      input.recipeId,
      input.foodId,
      input.weightG,
      input.sortOrder,
      input.timestamp,
      input.timestamp,
    );
  }

  async updateIngredient(input: {
    id: string;
    foodId: string;
    weightG: number;
    sortOrder: number;
    timestamp: string;
  }): Promise<void> {
    await this.database.runAsync(
      `UPDATE recipe_ingredients
       SET food_id = ?, weight_g = ?, sort_order = ?, updated_at = ?
       WHERE id = ?;`,
      input.foodId,
      input.weightG,
      input.sortOrder,
      input.timestamp,
      input.id,
    );
  }

  async deleteOverridesTargetingIngredient(ingredientId: string): Promise<void> {
    await this.database.runAsync(
      'DELETE FROM recipe_variation_overrides WHERE base_recipe_ingredient_id = ?;',
      ingredientId,
    );
  }

  async deleteIngredient(id: string): Promise<void> {
    await this.database.runAsync(
      'DELETE FROM recipe_ingredients WHERE id = ?;',
      id,
    );
  }

  async listDeletedIngredientFoodNames(recipeId: string): Promise<string[]> {
    const rows = await this.database.getAllAsync<{ name: string }>(
      `SELECT DISTINCT f.name
       FROM recipe_ingredients ri
       JOIN foods f ON f.id = ri.food_id
       WHERE ri.recipe_id = ? AND f.deleted_at IS NOT NULL
       UNION
       SELECT DISTINCT f.name
       FROM recipe_variation_overrides rvo
       JOIN recipe_variations rv ON rv.id = rvo.variation_id
       JOIN foods f ON f.id = rvo.food_id
       WHERE rv.recipe_id = ? AND f.deleted_at IS NOT NULL
       ORDER BY name COLLATE NOCASE;`,
      recipeId,
      recipeId,
    );
    return rows.map(({ name }) => name);
  }

  async softDelete(id: string, deletedAt: string): Promise<void> {
    await this.database.runAsync(
      `UPDATE recipes
       SET deleted_at = ?, updated_at = ?
       WHERE id = ? AND deleted_at IS NULL;`,
      deletedAt,
      deletedAt,
      id,
    );
  }

  async restore(id: string, restoredAt: string): Promise<void> {
    await this.database.runAsync(
      `UPDATE recipes
       SET deleted_at = NULL, updated_at = ?
       WHERE id = ? AND deleted_at IS NOT NULL;`,
      restoredAt,
      id,
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

  async findVariationById(id: string): Promise<RecipeVariationRecord | null> {
    return this.database.getFirstAsync<RecipeVariationRecord>(
      'SELECT * FROM recipe_variations WHERE id = ?;',
      id,
    );
  }

  async listVariations(
    recipeId: string,
    includeDeleted = false,
  ): Promise<RecipeVariationRecord[]> {
    return this.database.getAllAsync<RecipeVariationRecord>(
      `SELECT * FROM recipe_variations
       WHERE recipe_id = ? ${includeDeleted ? '' : 'AND deleted_at IS NULL'}
       ORDER BY name COLLATE NOCASE;`,
      recipeId,
    );
  }

  async createVariation(
    variation: Omit<RecipeVariationRecord, 'deleted_at'>,
  ): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO recipe_variations (
        id, recipe_id, name, finished_weight_g, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?);`,
      variation.id,
      variation.recipe_id,
      variation.name,
      variation.finished_weight_g,
      variation.created_at,
      variation.updated_at,
    );
  }

  async updateVariation(
    id: string,
    name: string,
    finishedWeightG: number,
    updatedAt: string,
  ): Promise<void> {
    await this.database.runAsync(
      `UPDATE recipe_variations
       SET name = ?, finished_weight_g = ?, updated_at = ?
       WHERE id = ? AND deleted_at IS NULL;`,
      name,
      finishedWeightG,
      updatedAt,
      id,
    );
  }

  async listVariationOverrides(
    variationId: string,
  ): Promise<RecipeVariationOverrideRecord[]> {
    return this.database.getAllAsync<RecipeVariationOverrideRecord>(
      `SELECT
         rvo.*, f.name AS food_name, f.deleted_at AS food_deleted_at
       FROM recipe_variation_overrides rvo
       LEFT JOIN foods f ON f.id = rvo.food_id
       WHERE rvo.variation_id = ?
       ORDER BY rvo.created_at, rvo.id;`,
      variationId,
    );
  }

  async deleteVariationOverrides(variationId: string): Promise<void> {
    await this.database.runAsync(
      'DELETE FROM recipe_variation_overrides WHERE variation_id = ?;',
      variationId,
    );
  }

  async insertVariationOverride(
    override: RecipeVariationOverrideRecord,
  ): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO recipe_variation_overrides (
        id, variation_id, action, base_recipe_ingredient_id,
        food_id, weight_g, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      override.id,
      override.variation_id,
      override.action,
      override.base_recipe_ingredient_id,
      override.food_id,
      override.weight_g,
      override.created_at,
      override.updated_at,
    );
  }

  async softDeleteVariation(id: string, deletedAt: string): Promise<void> {
    await this.database.runAsync(
      `UPDATE recipe_variations
       SET deleted_at = ?, updated_at = ?
       WHERE id = ? AND deleted_at IS NULL;`,
      deletedAt,
      deletedAt,
      id,
    );
  }

  async restoreVariation(id: string, restoredAt: string): Promise<void> {
    await this.database.runAsync(
      `UPDATE recipe_variations
       SET deleted_at = NULL, updated_at = ?
       WHERE id = ? AND deleted_at IS NOT NULL;`,
      restoredAt,
      id,
    );
  }
}
