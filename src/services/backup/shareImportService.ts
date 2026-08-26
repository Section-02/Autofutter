import { randomUUID } from 'expo-crypto';

import type { DatabaseConnection } from '@/data/database/types';
import type { FoodRecord } from '@/data/repositories/foodRepository';
import type { RecipeRecord } from '@/data/repositories/recipeRepository';
import { parseShareDocument, type ShareDocument } from '@/schemas/shareExport';

export type ImportConflictKind = 'food' | 'recipe';
export type ImportConflictChoice = 'keep' | 'overwrite';

export type ImportConflict = Readonly<{
  key: string;
  kind: ImportConflictKind;
  incomingId: string;
  incomingName: string;
  existingId: string;
  existingName: string;
}>;

export type ShareImportPreview = Readonly<{
  kind: ShareDocument['kind'];
  foods: number;
  recipes: number;
  conflicts: readonly ImportConflict[];
}>;

export type ShareImportResult = Readonly<{
  foodsAdded: number;
  foodsOverwritten: number;
  foodsKept: number;
  recipesAdded: number;
  recipesOverwritten: number;
  recipesKept: number;
}>;

type Options = Readonly<{
  createId?: () => string;
  now?: () => Date;
}>;

function normalizedName(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function conflictKey(kind: ImportConflictKind, incomingId: string): string {
  return `${kind}:${incomingId}`;
}

function findExisting<T extends { id: string; name: string; deleted_at: string | null }>(
  incoming: { id: string; name: string },
  records: readonly T[],
): T | null {
  const idMatch = records.find(({ id }) => id === incoming.id);
  if (idMatch) return idMatch;
  const name = normalizedName(incoming.name);
  return records.find((record) => record.deleted_at === null && normalizedName(record.name) === name)
    ?? records.find((record) => normalizedName(record.name) === name)
    ?? null;
}

export class ShareImportService {
  private readonly createId: () => string;
  private readonly now: () => Date;

  constructor(private readonly database: DatabaseConnection, options: Options = {}) {
    this.createId = options.createId ?? randomUUID;
    this.now = options.now ?? (() => new Date());
  }

  async preview(contents: string): Promise<ShareImportPreview> {
    const document = parseShareDocument(contents);
    const [foods, recipes] = await Promise.all([
      this.database.getAllAsync<FoodRecord>('SELECT * FROM foods ORDER BY id;'),
      this.database.getAllAsync<RecipeRecord>('SELECT * FROM recipes ORDER BY id;'),
    ]);
    return this.buildPreview(document, foods, recipes);
  }

  async import(
    contents: string,
    choices: Readonly<Record<string, ImportConflictChoice>>,
  ): Promise<ShareImportResult> {
    const document = parseShareDocument(contents);
    const result: ShareImportResult = {
      foodsAdded: 0,
      foodsOverwritten: 0,
      foodsKept: 0,
      recipesAdded: 0,
      recipesOverwritten: 0,
      recipesKept: 0,
    };
    const mutable = { ...result };
    const timestamp = this.now().toISOString();

    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const [existingFoods, existingRecipes] = await Promise.all([
        transaction.getAllAsync<FoodRecord>('SELECT * FROM foods ORDER BY id;'),
        transaction.getAllAsync<RecipeRecord>('SELECT * FROM recipes ORDER BY id;'),
      ]);
      const preview = this.buildPreview(document, existingFoods, existingRecipes);
      for (const conflict of preview.conflicts) {
        if (choices[conflict.key] !== 'keep' && choices[conflict.key] !== 'overwrite') {
          throw new Error('Choose how to resolve every import conflict.');
        }
      }

      const foodIdMap = new Map<string, string>();
      for (const food of document.data.foods) {
        const existing = findExisting(food, existingFoods);
        if (existing) {
          foodIdMap.set(food.id, existing.id);
          if (choices[conflictKey('food', food.id)] === 'keep') {
            mutable.foodsKept += 1;
            continue;
          }
          await this.overwriteFood(transaction, existing.id, food, timestamp);
          mutable.foodsOverwritten += 1;
        } else {
          foodIdMap.set(food.id, food.id);
          await this.insertFood(transaction, food.id, food, timestamp);
          mutable.foodsAdded += 1;
        }
        await this.replacePortions(transaction, food.id, foodIdMap.get(food.id)!, document, timestamp);
      }

      if (document.kind === 'foods') return;

      for (const recipe of document.data.recipes) {
        const existing = findExisting(recipe, existingRecipes);
        const choice = existing ? choices[conflictKey('recipe', recipe.id)] : undefined;
        if (existing && choice === 'keep') {
          mutable.recipesKept += 1;
          continue;
        }
        const targetRecipeId = existing?.id ?? recipe.id;
        if (existing) {
          await this.clearRecipeDefinition(transaction, targetRecipeId);
          await transaction.runAsync(
            `UPDATE recipes SET name = ?, finished_weight_g = ?, updated_at = ?, deleted_at = NULL
             WHERE id = ?;`,
            recipe.name, recipe.finished_weight_g, timestamp, targetRecipeId,
          );
          mutable.recipesOverwritten += 1;
        } else {
          await transaction.runAsync(
            `INSERT INTO recipes (
              id, name, finished_weight_g, use_count, last_used_at, created_at, updated_at, deleted_at
            ) VALUES (?, ?, ?, 0, NULL, ?, ?, NULL);`,
            targetRecipeId, recipe.name, recipe.finished_weight_g, timestamp, timestamp,
          );
          mutable.recipesAdded += 1;
        }

        const incomingIngredients = document.data.recipeIngredients.filter(({ recipe_id }) => recipe_id === recipe.id);
        const ingredientIdMap = new Map<string, string>();
        for (const ingredient of incomingIngredients) {
          const id = this.createId();
          ingredientIdMap.set(ingredient.id, id);
          await transaction.runAsync(
            `INSERT INTO recipe_ingredients (
              id, recipe_id, food_id, weight_g, sort_order, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
            id, targetRecipeId, this.mappedFoodId(foodIdMap, ingredient.food_id),
            ingredient.weight_g, ingredient.sort_order, timestamp, timestamp,
          );
        }

        const incomingVariations = document.data.recipeVariations.filter(({ recipe_id }) => recipe_id === recipe.id);
        for (const variation of incomingVariations) {
          const variationId = this.createId();
          await transaction.runAsync(
            `INSERT INTO recipe_variations (
              id, recipe_id, name, finished_weight_g, created_at, updated_at, deleted_at
            ) VALUES (?, ?, ?, ?, ?, ?, NULL);`,
            variationId, targetRecipeId, variation.name, variation.finished_weight_g, timestamp, timestamp,
          );
          const overrides = document.data.variationOverrides.filter(({ variation_id }) => variation_id === variation.id);
          for (const override of overrides) {
            await transaction.runAsync(
              `INSERT INTO recipe_variation_overrides (
                id, variation_id, action, base_recipe_ingredient_id,
                food_id, weight_g, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
              this.createId(), variationId, override.action,
              override.base_recipe_ingredient_id === null
                ? null
                : ingredientIdMap.get(override.base_recipe_ingredient_id) ?? null,
              override.food_id === null ? null : this.mappedFoodId(foodIdMap, override.food_id),
              override.weight_g, timestamp, timestamp,
            );
          }
        }
      }
    });

    return mutable;
  }

  private buildPreview(
    document: ShareDocument,
    foods: readonly FoodRecord[],
    recipes: readonly RecipeRecord[],
  ): ShareImportPreview {
    const conflicts: ImportConflict[] = [];
    for (const food of document.data.foods) {
      const existing = findExisting(food, foods);
      if (existing) conflicts.push({ key: conflictKey('food', food.id), kind: 'food', incomingId: food.id, incomingName: food.name, existingId: existing.id, existingName: existing.name });
    }
    if (document.kind === 'recipes') {
      for (const recipe of document.data.recipes) {
        const existing = findExisting(recipe, recipes);
        if (existing) conflicts.push({ key: conflictKey('recipe', recipe.id), kind: 'recipe', incomingId: recipe.id, incomingName: recipe.name, existingId: existing.id, existingName: existing.name });
      }
    }
    return { kind: document.kind, foods: document.data.foods.length, recipes: document.kind === 'recipes' ? document.data.recipes.length : 0, conflicts };
  }

  private mappedFoodId(map: ReadonlyMap<string, string>, incomingId: string): string {
    const mapped = map.get(incomingId);
    if (!mapped) throw new Error('The import is missing a required food mapping.');
    return mapped;
  }

  private async insertFood(transaction: DatabaseConnection, id: string, food: ShareDocument['data']['foods'][number], timestamp: string): Promise<void> {
    await transaction.runAsync(
      `INSERT INTO foods (
        id, name, reference_weight_g, calories, protein_g, fat_g, carbs_g,
        sodium_mg, cholesterol_mg, source_type, source_id, use_count,
        last_used_at, created_at, updated_at, deleted_at,
        standard_portion_label, standard_portion_weight_g
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?, NULL, ?, ?);`,
      id, food.name, food.reference_weight_g, food.calories, food.protein_g,
      food.fat_g, food.carbs_g, food.sodium_mg, food.cholesterol_mg,
      food.source_type, food.source_id, timestamp, timestamp,
      food.standard_portion_label, food.standard_portion_weight_g,
    );
  }

  private async overwriteFood(transaction: DatabaseConnection, id: string, food: ShareDocument['data']['foods'][number], timestamp: string): Promise<void> {
    await transaction.runAsync(
      `UPDATE foods SET
        name = ?, reference_weight_g = ?, calories = ?, protein_g = ?, fat_g = ?,
        carbs_g = ?, sodium_mg = ?, cholesterol_mg = ?, source_type = ?, source_id = ?,
        standard_portion_label = ?, standard_portion_weight_g = ?, updated_at = ?, deleted_at = NULL
       WHERE id = ?;`,
      food.name, food.reference_weight_g, food.calories, food.protein_g,
      food.fat_g, food.carbs_g, food.sodium_mg, food.cholesterol_mg,
      food.source_type, food.source_id, food.standard_portion_label,
      food.standard_portion_weight_g, timestamp, id,
    );
  }

  private async replacePortions(transaction: DatabaseConnection, incomingFoodId: string, targetFoodId: string, document: ShareDocument, timestamp: string): Promise<void> {
    await transaction.runAsync('DELETE FROM food_portion_conversions WHERE food_id = ?;', targetFoodId);
    const portions = document.data.foodPortions.filter(({ food_id }) => food_id === incomingFoodId);
    for (const portion of portions) {
      await transaction.runAsync(
        `INSERT INTO food_portion_conversions (
          food_id, sort_order, label, amount, gram_weight_g, volume_unit,
          source_type, source_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        targetFoodId, portion.sort_order, portion.label, portion.amount,
        portion.gram_weight_g, portion.volume_unit, portion.source_type,
        portion.source_id, timestamp,
      );
    }
  }

  private async clearRecipeDefinition(transaction: DatabaseConnection, recipeId: string): Promise<void> {
    await transaction.runAsync(
      `DELETE FROM recipe_variations WHERE recipe_id = ?;`, recipeId,
    );
    await transaction.runAsync(
      `DELETE FROM recipe_ingredients WHERE recipe_id = ?;`, recipeId,
    );
  }
}
