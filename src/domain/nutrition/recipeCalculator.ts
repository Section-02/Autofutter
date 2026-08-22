import {
  addNutrition,
  scaleNutrition,
} from './nutritionCalculator';
import {
  ZERO_NUTRITION,
  type Nutrition,
  type WeightedIngredient,
} from './nutritionTypes';
import {
  assertCompleteNutrition,
  assertNonEmptyId,
  assertPositiveFinite,
} from './validation';

export function assertValidWeightedIngredient(ingredient: WeightedIngredient): void {
  assertNonEmptyId(ingredient.id, 'Ingredient id');
  assertNonEmptyId(ingredient.foodId, 'Food id');
  assertPositiveFinite(ingredient.referenceWeightG, 'Reference weight');
  assertPositiveFinite(ingredient.weightG, 'Ingredient weight');
  assertCompleteNutrition(ingredient.nutrition);
}

export function calculateRecipeNutrition(
  ingredients: readonly WeightedIngredient[],
): Nutrition {
  return ingredients.reduce<Nutrition>((total, ingredient) => {
    assertValidWeightedIngredient(ingredient);

    const scaledIngredient = scaleNutrition(
      ingredient.nutrition,
      ingredient.weightG,
      ingredient.referenceWeightG,
    );

    return addNutrition(total, scaledIngredient);
  }, ZERO_NUTRITION);
}

export function calculateRecipePortion(
  exactRecipeNutrition: Nutrition,
  portionWeightG: number,
  finishedWeightG: number,
): Nutrition {
  assertCompleteNutrition(exactRecipeNutrition);
  assertPositiveFinite(portionWeightG, 'Portion weight');
  assertPositiveFinite(finishedWeightG, 'Finished weight');

  return scaleNutrition(
    exactRecipeNutrition,
    portionWeightG,
    finishedWeightG,
  );
}
