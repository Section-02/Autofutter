import { randomUUID } from 'expo-crypto';

import type { DatabaseConnection } from '@/data/database/types';
import { FoodRepository } from '@/data/repositories/foodRepository';
import {
  RecipeRepository,
  type RecipeIngredientNutritionRecord,
  type RecipeRecord,
  type RecipeSort,
  type RecipeVariationOverrideRecord,
  type RecipeVariationRecord,
  type VariationOverrideAction,
} from '@/data/repositories/recipeRepository';
import {
  calculateRecipeNutrition,
} from '@/domain/nutrition/recipeCalculator';
import { scaleNutrition } from '@/domain/nutrition/nutritionCalculator';
import type {
  FoodNutritionSource,
  Nutrition,
  WeightedIngredient,
} from '@/domain/nutrition/nutritionTypes';
import {
  resolveVariation,
  type VariationOverride,
} from '@/domain/recipes/variationResolver';

export type RecipeIngredientInput = Readonly<{
  id?: string;
  foodId: string;
  weightG: number;
}>;

export type RecipeDraft = Readonly<{
  name: string;
  finishedWeightG: number | null;
  ingredients: readonly RecipeIngredientInput[];
}>;

export type RecipeDetails = Readonly<{
  recipe: RecipeRecord;
  ingredients: readonly RecipeIngredientNutritionRecord[];
  isComplete: boolean;
  exactNutrition: Nutrition | null;
  nutritionPer100G: Nutrition | null;
}>;

export type RecipeListItem = Readonly<{
  recipe: RecipeRecord;
  isComplete: boolean;
  caloriesPer100G: number | null;
}>;

type OverrideBase = Readonly<{ id?: string }>;

export type ReplaceOverrideInput = OverrideBase &
  Readonly<{
    action: 'replace';
    baseIngredientId: string;
    foodId: string;
    weightG?: number;
  }>;

export type RemoveOverrideInput = OverrideBase &
  Readonly<{
    action: 'remove';
    baseIngredientId: string;
  }>;

export type AddOverrideInput = OverrideBase &
  Readonly<{
    action: 'add';
    foodId: string;
    weightG: number;
  }>;

export type ChangeWeightOverrideInput = OverrideBase &
  Readonly<{
    action: 'change_weight';
    baseIngredientId: string;
    weightG: number;
  }>;

export type VariationOverrideInput =
  | ReplaceOverrideInput
  | RemoveOverrideInput
  | AddOverrideInput
  | ChangeWeightOverrideInput;

export type VariationDraft = Readonly<{
  name: string;
  finishedWeightG: number;
  overrides: readonly VariationOverrideInput[];
}>;

export type VariationDetails = Readonly<{
  variation: RecipeVariationRecord;
  recipe: RecipeRecord;
  baseIngredients: readonly RecipeIngredientNutritionRecord[];
  overrides: readonly RecipeVariationOverrideRecord[];
  resolvedIngredients: readonly WeightedIngredient[];
  exactNutrition: Nutrition;
  nutritionPer100G: Nutrition;
}>;

type RecipeServiceOptions = Readonly<{
  createId?: () => string;
  now?: () => Date;
}>;

export class RecipeValidationError extends Error {}

export class RecipeRestoreError extends Error {
  constructor(readonly foodNames: readonly string[]) {
    super(`Restore these foods first: ${foodNames.join(', ')}.`);
  }
}

function validatePositive(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RecipeValidationError(`${label} must be greater than zero.`);
  }
}

function nutritionFromRow(row: RecipeIngredientNutritionRecord): Nutrition {
  return {
    calories: row.calories,
    proteinG: row.protein_g,
    fatG: row.fat_g,
    carbsG: row.carbs_g,
    sodiumMg: row.sodium_mg,
    cholesterolMg: row.cholesterol_mg,
  };
}

function weightedFromRow(row: RecipeIngredientNutritionRecord): WeightedIngredient {
  return {
    id: row.id,
    foodId: row.food_id,
    weightG: row.weight_g,
    referenceWeightG: row.reference_weight_g,
    nutrition: nutritionFromRow(row),
  };
}

async function activeFoodSource(
  database: DatabaseConnection,
  foodId: string,
): Promise<FoodNutritionSource> {
  const food = await new FoodRepository(database).findById(foodId);
  if (food === null || food.deleted_at !== null) {
    throw new RecipeValidationError('Ingredient food was not found.');
  }
  return {
    foodId: food.id,
    referenceWeightG: food.reference_weight_g,
    nutrition: {
      calories: food.calories,
      proteinG: food.protein_g,
      fatG: food.fat_g,
      carbsG: food.carbs_g,
      sodiumMg: food.sodium_mg,
      cholesterolMg: food.cholesterol_mg,
    },
  };
}

async function loadRecipeDetails(
  database: DatabaseConnection,
  recipeId: string,
): Promise<RecipeDetails> {
  const repository = new RecipeRepository(database);
  const recipe = await repository.findById(recipeId);
  if (recipe === null) throw new Error('Recipe was not found.');
  const ingredients = await repository.listIngredients(recipeId);
  const isComplete =
    recipe.deleted_at === null &&
    recipe.name.trim().length > 0 &&
    recipe.finished_weight_g !== null &&
    recipe.finished_weight_g > 0 &&
    ingredients.length > 0 &&
    ingredients.every(
      ({ weight_g, food_deleted_at }) => weight_g > 0 && food_deleted_at === null,
    );
  if (!isComplete) {
    return {
      recipe,
      ingredients,
      isComplete: false,
      exactNutrition: null,
      nutritionPer100G: null,
    };
  }
  const exactNutrition = calculateRecipeNutrition(ingredients.map(weightedFromRow));
  return {
    recipe,
    ingredients,
    isComplete: true,
    exactNutrition,
    nutritionPer100G: scaleNutrition(
      exactNutrition,
      100,
      recipe.finished_weight_g!,
    ),
  };
}

export class RecipeService {
  private readonly createId: () => string;
  private readonly now: () => Date;

  constructor(
    private readonly database: DatabaseConnection,
    options: RecipeServiceOptions = {},
  ) {
    this.createId = options.createId ?? randomUUID;
    this.now = options.now ?? (() => new Date());
  }

  async list(query = '', sort: RecipeSort = 'most_used'): Promise<RecipeListItem[]> {
    const recipes = await new RecipeRepository(this.database).listActive(query, sort);
    return Promise.all(
      recipes.map(async (recipe) => {
        const details = await loadRecipeDetails(this.database, recipe.id);
        return {
          recipe,
          isComplete: details.isComplete,
          caloriesPer100G: details.nutritionPer100G?.calories ?? null,
        };
      }),
    );
  }

  async listDeleted(): Promise<RecipeRecord[]> {
    return new RecipeRepository(this.database).listDeleted();
  }

  async load(recipeId: string): Promise<RecipeDetails> {
    return loadRecipeDetails(this.database, recipeId);
  }

  private validateDraft(draft: RecipeDraft): RecipeDraft {
    const name = draft.name.trim();
    if (!name) throw new RecipeValidationError('Recipe name is required.');
    if (draft.finishedWeightG !== null) {
      validatePositive(draft.finishedWeightG, 'Finished weight');
    }
    const ids = new Set<string>();
    for (const ingredient of draft.ingredients) {
      if (!ingredient.foodId.trim()) {
        throw new RecipeValidationError('Ingredient food is required.');
      }
      validatePositive(ingredient.weightG, 'Ingredient weight');
      if (ingredient.id) {
        if (ids.has(ingredient.id)) {
          throw new RecipeValidationError('Duplicate ingredient line.');
        }
        ids.add(ingredient.id);
      }
    }
    return { ...draft, name };
  }

  private async saveIngredients(
    database: DatabaseConnection,
    recipeId: string,
    ingredients: readonly RecipeIngredientInput[],
    timestamp: string,
  ): Promise<void> {
    const repository = new RecipeRepository(database);
    const existing = await repository.listIngredients(recipeId);
    const existingIds = new Set(existing.map(({ id }) => id));
    const keptIds = new Set(
      ingredients
        .map(({ id }) => id)
        .filter((id): id is string => id !== undefined && existingIds.has(id)),
    );

    for (const row of existing) {
      if (!keptIds.has(row.id)) {
        await repository.deleteOverridesTargetingIngredient(row.id);
        await repository.deleteIngredient(row.id);
      }
    }

    for (const [sortOrder, ingredient] of ingredients.entries()) {
      await activeFoodSource(database, ingredient.foodId);
      if (ingredient.id && existingIds.has(ingredient.id)) {
        await repository.updateIngredient({
          id: ingredient.id,
          foodId: ingredient.foodId,
          weightG: ingredient.weightG,
          sortOrder,
          timestamp,
        });
      } else {
        await repository.insertIngredient({
          id: this.createId(),
          recipeId,
          foodId: ingredient.foodId,
          weightG: ingredient.weightG,
          sortOrder,
          timestamp,
        });
      }
    }
  }

  async create(draft: RecipeDraft): Promise<RecipeDetails> {
    const valid = this.validateDraft(draft);
    const recipeId = this.createId();
    const timestamp = this.now().toISOString();
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      await new RecipeRepository(transaction).create({
        id: recipeId,
        name: valid.name,
        finished_weight_g: valid.finishedWeightG,
        created_at: timestamp,
        updated_at: timestamp,
      });
      await this.saveIngredients(transaction, recipeId, valid.ingredients, timestamp);
    });
    return this.load(recipeId);
  }

  async update(recipeId: string, draft: RecipeDraft): Promise<RecipeDetails> {
    const valid = this.validateDraft(draft);
    const timestamp = this.now().toISOString();
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const repository = new RecipeRepository(transaction);
      const recipe = await repository.findById(recipeId);
      if (recipe === null || recipe.deleted_at !== null) {
        throw new Error('Recipe was not found.');
      }
      await repository.update(
        recipeId,
        valid.name,
        valid.finishedWeightG,
        timestamp,
      );
      await this.saveIngredients(transaction, recipeId, valid.ingredients, timestamp);
    });
    return this.load(recipeId);
  }

  async preview(draft: RecipeDraft): Promise<{
    isComplete: boolean;
    exactNutrition: Nutrition | null;
    nutritionPer100G: Nutrition | null;
  }> {
    const valid = this.validateDraft(draft);
    if (valid.ingredients.length === 0 || valid.finishedWeightG === null) {
      return { isComplete: false, exactNutrition: null, nutritionPer100G: null };
    }
    const weighted: WeightedIngredient[] = [];
    for (const [index, ingredient] of valid.ingredients.entries()) {
      weighted.push({
        id: ingredient.id ?? `preview-${index}`,
        weightG: ingredient.weightG,
        ...(await activeFoodSource(this.database, ingredient.foodId)),
      });
    }
    const exactNutrition = calculateRecipeNutrition(weighted);
    return {
      isComplete: true,
      exactNutrition,
      nutritionPer100G: scaleNutrition(
        exactNutrition,
        100,
        valid.finishedWeightG,
      ),
    };
  }

  async softDelete(recipeId: string): Promise<void> {
    const recipe = await new RecipeRepository(this.database).findById(recipeId);
    if (recipe === null || recipe.deleted_at !== null) {
      throw new Error('Recipe was not found.');
    }
    await new RecipeRepository(this.database).softDelete(
      recipeId,
      this.now().toISOString(),
    );
  }

  async restore(recipeId: string): Promise<void> {
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const repository = new RecipeRepository(transaction);
      const recipe = await repository.findById(recipeId);
      if (recipe === null) throw new Error('Recipe was not found.');
      if (recipe.deleted_at === null) return;
      const foodNames = await repository.listDeletedIngredientFoodNames(recipeId);
      if (foodNames.length > 0) throw new RecipeRestoreError(foodNames);
      await repository.restore(recipeId, this.now().toISOString());
    });
  }

  async permanentlyDelete(recipeId: string): Promise<void> {
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const repository = new RecipeRepository(transaction);
      const recipe = await repository.findById(recipeId);
      if (recipe === null || recipe.deleted_at === null) {
        throw new Error('Only deleted recipes can be permanently deleted.');
      }
      await repository.hardDelete(recipeId);
    });
  }

  async listVariations(recipeId: string): Promise<RecipeVariationRecord[]> {
    return new RecipeRepository(this.database).listVariations(recipeId);
  }

  private validateVariationDraft(draft: VariationDraft): VariationDraft {
    const name = draft.name.trim();
    if (!name) throw new RecipeValidationError('Variation name is required.');
    validatePositive(draft.finishedWeightG, 'Finished weight');
    return { ...draft, name };
  }

  private async domainOverrides(
    database: DatabaseConnection,
    inputs: readonly VariationOverrideInput[],
  ): Promise<VariationOverride[]> {
    const overrides: VariationOverride[] = [];
    for (const [index, input] of inputs.entries()) {
      switch (input.action) {
        case 'replace':
          overrides.push({
            action: input.action,
            baseIngredientId: input.baseIngredientId,
            food: await activeFoodSource(database, input.foodId),
            weightG: input.weightG,
          });
          break;
        case 'remove':
          overrides.push({
            action: input.action,
            baseIngredientId: input.baseIngredientId,
          });
          break;
        case 'add':
          overrides.push({
            action: input.action,
            ingredient: {
              id: input.id ?? `preview-add-${index}`,
              weightG: input.weightG,
              ...(await activeFoodSource(database, input.foodId)),
            },
          });
          break;
        case 'change_weight':
          overrides.push({
            action: input.action,
            baseIngredientId: input.baseIngredientId,
            weightG: input.weightG,
          });
          break;
      }
    }
    return overrides;
  }

  private async validateResolvedVariation(
    database: DatabaseConnection,
    recipeId: string,
    inputs: readonly VariationOverrideInput[],
  ): Promise<WeightedIngredient[]> {
    const base = await loadRecipeDetails(database, recipeId);
    if (base.recipe.deleted_at !== null || base.ingredients.length === 0) {
      throw new RecipeValidationError('Base recipe needs at least one ingredient.');
    }
    const resolved = resolveVariation(
      base.ingredients.map(weightedFromRow),
      await this.domainOverrides(database, inputs),
    );
    if (resolved.length === 0) {
      throw new RecipeValidationError('Variation needs at least one ingredient.');
    }
    return resolved;
  }

  private overrideRecord(
    variationId: string,
    input: VariationOverrideInput,
    timestamp: string,
  ): RecipeVariationOverrideRecord {
    const id = this.createId();
    const base = {
      id,
      variation_id: variationId,
      action: input.action as VariationOverrideAction,
      created_at: timestamp,
      updated_at: timestamp,
      food_name: null,
      food_deleted_at: null,
    };
    switch (input.action) {
      case 'replace':
        return {
          ...base,
          base_recipe_ingredient_id: input.baseIngredientId,
          food_id: input.foodId,
          weight_g: input.weightG ?? null,
        };
      case 'remove':
        return {
          ...base,
          base_recipe_ingredient_id: input.baseIngredientId,
          food_id: null,
          weight_g: null,
        };
      case 'add':
        return {
          ...base,
          base_recipe_ingredient_id: null,
          food_id: input.foodId,
          weight_g: input.weightG,
        };
      case 'change_weight':
        return {
          ...base,
          base_recipe_ingredient_id: input.baseIngredientId,
          food_id: null,
          weight_g: input.weightG,
        };
    }
  }

  private async replaceOverrides(
    database: DatabaseConnection,
    variationId: string,
    inputs: readonly VariationOverrideInput[],
    timestamp: string,
  ): Promise<void> {
    const repository = new RecipeRepository(database);
    await repository.deleteVariationOverrides(variationId);
    for (const input of inputs) {
      await repository.insertVariationOverride(
        this.overrideRecord(variationId, input, timestamp),
      );
    }
  }

  async createVariation(
    recipeId: string,
    draft: VariationDraft,
  ): Promise<VariationDetails> {
    const valid = this.validateVariationDraft(draft);
    const variationId = this.createId();
    const timestamp = this.now().toISOString();
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      await this.validateResolvedVariation(transaction, recipeId, valid.overrides);
      await new RecipeRepository(transaction).createVariation({
        id: variationId,
        recipe_id: recipeId,
        name: valid.name,
        finished_weight_g: valid.finishedWeightG,
        created_at: timestamp,
        updated_at: timestamp,
      });
      await this.replaceOverrides(
        transaction,
        variationId,
        valid.overrides,
        timestamp,
      );
    });
    return this.loadVariation(variationId);
  }

  async updateVariation(
    variationId: string,
    draft: VariationDraft,
  ): Promise<VariationDetails> {
    const valid = this.validateVariationDraft(draft);
    const timestamp = this.now().toISOString();
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const repository = new RecipeRepository(transaction);
      const variation = await repository.findVariationById(variationId);
      if (variation === null || variation.deleted_at !== null) {
        throw new Error('Variation was not found.');
      }
      await this.validateResolvedVariation(
        transaction,
        variation.recipe_id,
        valid.overrides,
      );
      await repository.updateVariation(
        variationId,
        valid.name,
        valid.finishedWeightG,
        timestamp,
      );
      await this.replaceOverrides(
        transaction,
        variationId,
        valid.overrides,
        timestamp,
      );
    });
    return this.loadVariation(variationId);
  }

  async loadVariation(variationId: string): Promise<VariationDetails> {
    const repository = new RecipeRepository(this.database);
    const variation = await repository.findVariationById(variationId);
    if (variation === null) throw new Error('Variation was not found.');
    const recipe = await repository.findById(variation.recipe_id);
    if (recipe === null) throw new Error('Base recipe was not found.');
    const baseIngredients = await repository.listIngredients(recipe.id);
    const overrides = await repository.listVariationOverrides(variationId);
    const inputs = overrides.map((row): VariationOverrideInput => {
      switch (row.action) {
        case 'replace':
          return {
            id: row.id,
            action: row.action,
            baseIngredientId: row.base_recipe_ingredient_id!,
            foodId: row.food_id!,
            weightG: row.weight_g ?? undefined,
          };
        case 'remove':
          return {
            id: row.id,
            action: row.action,
            baseIngredientId: row.base_recipe_ingredient_id!,
          };
        case 'add':
          return {
            id: row.id,
            action: row.action,
            foodId: row.food_id!,
            weightG: row.weight_g!,
          };
        case 'change_weight':
          return {
            id: row.id,
            action: row.action,
            baseIngredientId: row.base_recipe_ingredient_id!,
            weightG: row.weight_g!,
          };
      }
    });
    const resolvedIngredients = resolveVariation(
      baseIngredients.map(weightedFromRow),
      await this.domainOverrides(this.database, inputs),
    );
    const exactNutrition = calculateRecipeNutrition(resolvedIngredients);
    if (variation.finished_weight_g === null || variation.finished_weight_g <= 0) {
      throw new RecipeValidationError('Variation finished weight is required.');
    }
    return {
      variation,
      recipe,
      baseIngredients,
      overrides,
      resolvedIngredients,
      exactNutrition,
      nutritionPer100G: scaleNutrition(
        exactNutrition,
        100,
        variation.finished_weight_g,
      ),
    };
  }

  async previewVariation(
    recipeId: string,
    draft: VariationDraft,
  ): Promise<{ exactNutrition: Nutrition; nutritionPer100G: Nutrition }> {
    const valid = this.validateVariationDraft(draft);
    const resolved = await this.validateResolvedVariation(
      this.database,
      recipeId,
      valid.overrides,
    );
    const exactNutrition = calculateRecipeNutrition(resolved);
    return {
      exactNutrition,
      nutritionPer100G: scaleNutrition(
        exactNutrition,
        100,
        valid.finishedWeightG,
      ),
    };
  }

  async softDeleteVariation(variationId: string): Promise<void> {
    const variation = await new RecipeRepository(this.database).findVariationById(
      variationId,
    );
    if (variation === null || variation.deleted_at !== null) {
      throw new Error('Variation was not found.');
    }
    await new RecipeRepository(this.database).softDeleteVariation(
      variationId,
      this.now().toISOString(),
    );
  }

  async restoreVariation(variationId: string): Promise<void> {
    const variation = await new RecipeRepository(this.database).findVariationById(
      variationId,
    );
    if (variation === null) throw new Error('Variation was not found.');
    await this.load(variation.recipe_id);
    await new RecipeRepository(this.database).restoreVariation(
      variationId,
      this.now().toISOString(),
    );
    await this.loadVariation(variationId);
  }
}
