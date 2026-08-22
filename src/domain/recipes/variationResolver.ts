import { calculateRecipeNutrition } from '@/domain/nutrition/recipeCalculator';
import type {
  FoodNutritionSource,
  Nutrition,
  WeightedIngredient,
} from '@/domain/nutrition/nutritionTypes';
import {
  assertCompleteNutrition,
  assertNonEmptyId,
  assertPositiveFinite,
} from '@/domain/nutrition/validation';

export type ReplaceIngredientOverride = Readonly<{
  action: 'replace';
  baseIngredientId: string;
  food: FoodNutritionSource;
  weightG?: number;
}>;

export type RemoveIngredientOverride = Readonly<{
  action: 'remove';
  baseIngredientId: string;
}>;

export type AddIngredientOverride = Readonly<{
  action: 'add';
  ingredient: WeightedIngredient;
}>;

export type ChangeIngredientWeightOverride = Readonly<{
  action: 'change_weight';
  baseIngredientId: string;
  weightG: number;
}>;

export type VariationOverride =
  | ReplaceIngredientOverride
  | RemoveIngredientOverride
  | AddIngredientOverride
  | ChangeIngredientWeightOverride;

function cloneFood(food: FoodNutritionSource): FoodNutritionSource {
  return {
    foodId: food.foodId,
    referenceWeightG: food.referenceWeightG,
    nutrition: { ...food.nutrition },
  };
}

function cloneIngredient(ingredient: WeightedIngredient): WeightedIngredient {
  return {
    id: ingredient.id,
    weightG: ingredient.weightG,
    ...cloneFood(ingredient),
  };
}

function assertValidFood(food: FoodNutritionSource): void {
  assertNonEmptyId(food.foodId, 'Food id');
  assertPositiveFinite(food.referenceWeightG, 'Reference weight');
  assertCompleteNutrition(food.nutrition);
}

function findIngredientIndex(
  ingredients: readonly WeightedIngredient[],
  ingredientId: string,
): number {
  assertNonEmptyId(ingredientId, 'Base ingredient id');
  const index = ingredients.findIndex(({ id }) => id === ingredientId);

  if (index < 0) {
    throw new Error(`Variation target ingredient "${ingredientId}" was not found.`);
  }

  return index;
}

export function resolveVariation(
  baseIngredients: readonly WeightedIngredient[],
  overrides: readonly VariationOverride[],
): WeightedIngredient[] {
  const resolved = baseIngredients.map(cloneIngredient);
  const baseIds = new Set<string>();

  for (const ingredient of resolved) {
    assertNonEmptyId(ingredient.id, 'Ingredient id');
    assertValidFood(ingredient);
    assertPositiveFinite(ingredient.weightG, 'Ingredient weight');

    if (baseIds.has(ingredient.id)) {
      throw new Error(`Duplicate ingredient id "${ingredient.id}".`);
    }
    baseIds.add(ingredient.id);
  }

  for (const override of overrides) {
    switch (override.action) {
      case 'replace': {
        const index = findIngredientIndex(resolved, override.baseIngredientId);
        const target = resolved[index];

        if (target === undefined) {
          throw new Error('Variation target ingredient was not found.');
        }

        assertValidFood(override.food);
        const weightG = override.weightG ?? target.weightG;
        assertPositiveFinite(weightG, 'Replacement ingredient weight');
        resolved[index] = {
          id: target.id,
          weightG,
          ...cloneFood(override.food),
        };
        break;
      }
      case 'remove': {
        const index = findIngredientIndex(resolved, override.baseIngredientId);
        resolved.splice(index, 1);
        break;
      }
      case 'add': {
        const ingredient = cloneIngredient(override.ingredient);
        assertNonEmptyId(ingredient.id, 'Added ingredient id');
        assertValidFood(ingredient);
        assertPositiveFinite(ingredient.weightG, 'Added ingredient weight');

        if (resolved.some(({ id }) => id === ingredient.id)) {
          throw new Error(`Duplicate ingredient id "${ingredient.id}".`);
        }
        resolved.push(ingredient);
        break;
      }
      case 'change_weight': {
        const index = findIngredientIndex(resolved, override.baseIngredientId);
        const target = resolved[index];

        if (target === undefined) {
          throw new Error('Variation target ingredient was not found.');
        }

        assertPositiveFinite(override.weightG, 'Ingredient weight');
        resolved[index] = { ...target, weightG: override.weightG };
        break;
      }
    }
  }

  return resolved;
}

export function calculateVariationNutrition(
  baseIngredients: readonly WeightedIngredient[],
  overrides: readonly VariationOverride[],
): Nutrition {
  return calculateRecipeNutrition(resolveVariation(baseIngredients, overrides));
}
