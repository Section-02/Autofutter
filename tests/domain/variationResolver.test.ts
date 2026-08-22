import { roundLoggedNutrition } from '../../src/domain/nutrition/nutritionCalculator';
import {
  calculateRecipeNutrition,
  calculateRecipePortion,
} from '../../src/domain/nutrition/recipeCalculator';
import type {
  FoodNutritionSource,
  Nutrition,
  WeightedIngredient,
} from '../../src/domain/nutrition/nutritionTypes';
import {
  calculateVariationNutrition,
  resolveVariation,
} from '../../src/domain/recipes/variationResolver';

function food(foodId: string, calories: number): FoodNutritionSource {
  const nutrition: Nutrition = {
    calories,
    proteinG: calories / 10,
    fatG: calories / 20,
    carbsG: calories / 8,
    sodiumMg: calories * 2,
    cholesterolMg: calories / 4,
  };

  return { foodId, referenceWeightG: 100, nutrition };
}

const beef = food('beef', 254.4);
const blackBeans = food('black-beans', 132.5);
const onion = food('onion', 40.25);
const pintoBeans = food('pinto-beans', 143.75);
const garlic = food('garlic', 149.5);

const baseIngredients: readonly WeightedIngredient[] = [
  { id: 'beef-line', weightG: 500, ...beef },
  { id: 'beans-line', weightG: 400, ...blackBeans },
  { id: 'onion-line', weightG: 150, ...onion },
];

describe('variationResolver', () => {
  it('inherits the complete base recipe without mutating or sharing objects', () => {
    const resolved = resolveVariation(baseIngredients, []);

    expect(resolved).toEqual(baseIngredients);
    expect(resolved).not.toBe(baseIngredients);
    expect(resolved[0]).not.toBe(baseIngredients[0]);
    expect(resolved[0]?.nutrition).not.toBe(baseIngredients[0]?.nutrition);
  });

  it('replaces an ingredient and inherits its base weight when none is supplied', () => {
    const resolved = resolveVariation(baseIngredients, [
      {
        action: 'replace',
        baseIngredientId: 'beans-line',
        food: pintoBeans,
      },
    ]);

    expect(resolved[1]).toMatchObject({
      id: 'beans-line',
      foodId: 'pinto-beans',
      weightG: 400,
    });
    expect(baseIngredients[1]?.foodId).toBe('black-beans');
  });

  it('removes a base ingredient', () => {
    const resolved = resolveVariation(baseIngredients, [
      { action: 'remove', baseIngredientId: 'onion-line' },
    ]);

    expect(resolved.map(({ id }) => id)).toEqual(['beef-line', 'beans-line']);
  });

  it('adds a weighted ingredient after inherited ingredients', () => {
    const resolved = resolveVariation(baseIngredients, [
      {
        action: 'add',
        ingredient: { id: 'garlic-line', weightG: 10.5, ...garlic },
      },
    ]);

    expect(resolved.at(-1)).toMatchObject({
      id: 'garlic-line',
      foodId: 'garlic',
      weightG: 10.5,
    });
  });

  it('changes an inherited ingredient weight without replacing its food', () => {
    const resolved = resolveVariation(baseIngredients, [
      {
        action: 'change_weight',
        baseIngredientId: 'beef-line',
        weightG: 450.25,
      },
    ]);

    expect(resolved[0]).toMatchObject({
      id: 'beef-line',
      foodId: 'beef',
      weightG: 450.25,
    });
  });

  it('applies every override action in order and calculates resolved nutrition', () => {
    const overrides = [
      {
        action: 'replace' as const,
        baseIngredientId: 'beans-line',
        food: pintoBeans,
        weightG: 410.25,
      },
      { action: 'remove' as const, baseIngredientId: 'onion-line' },
      {
        action: 'add' as const,
        ingredient: { id: 'garlic-line', weightG: 10.5, ...garlic },
      },
      {
        action: 'change_weight' as const,
        baseIngredientId: 'beef-line',
        weightG: 475.75,
      },
    ];
    const resolved = resolveVariation(baseIngredients, overrides);

    expect(resolved.map(({ foodId, weightG }) => ({ foodId, weightG }))).toEqual([
      { foodId: 'beef', weightG: 475.75 },
      { foodId: 'pinto-beans', weightG: 410.25 },
      { foodId: 'garlic', weightG: 10.5 },
    ]);
    expect(calculateVariationNutrition(baseIngredients, overrides)).toEqual(
      calculateRecipeNutrition(resolved),
    );
  });

  it('calculates and rounds a variation portion only after resolving overrides', () => {
    const overrides = [
      {
        action: 'replace' as const,
        baseIngredientId: 'beans-line',
        food: pintoBeans,
      },
    ];
    const exactTotal = calculateVariationNutrition(baseIngredients, overrides);
    const exactPortion = calculateRecipePortion(exactTotal, 187, 1_920);
    const loggedPortion = roundLoggedNutrition(exactPortion);
    const manuallyResolved = [
      baseIngredients[0]!,
      { ...baseIngredients[1]!, ...pintoBeans },
      baseIngredients[2]!,
    ];
    const expectedTotal = calculateRecipeNutrition(manuallyResolved);

    expect(exactPortion.calories).toBeCloseTo(
      expectedTotal.calories * (187 / 1_920),
      12,
    );
    expect(loggedPortion.calories).toBe(Math.ceil(exactPortion.calories));
    expect(loggedPortion.proteinG).toBe(Math.ceil(exactPortion.proteinG));
    expect(loggedPortion.fatG).toBe(Math.ceil(exactPortion.fatG));
    expect(loggedPortion.carbsG).toBe(Math.ceil(exactPortion.carbsG));
    expect(loggedPortion.sodiumMg).toBe(Math.ceil(exactPortion.sodiumMg));
    expect(loggedPortion.cholesterolMg).toBe(
      Math.ceil(exactPortion.cholesterolMg),
    );
  });

  it('rejects missing targets, duplicate additions, and invalid weights', () => {
    expect(() =>
      resolveVariation(baseIngredients, [
        { action: 'remove', baseIngredientId: 'missing-line' },
      ]),
    ).toThrow('Variation target ingredient "missing-line" was not found.');

    expect(() =>
      resolveVariation(baseIngredients, [
        {
          action: 'add',
          ingredient: { id: 'beef-line', weightG: 10, ...garlic },
        },
      ]),
    ).toThrow('Duplicate ingredient id "beef-line".');

    expect(() =>
      resolveVariation(baseIngredients, [
        {
          action: 'change_weight',
          baseIngredientId: 'beef-line',
          weightG: 0,
        },
      ]),
    ).toThrow('Ingredient weight must be a positive finite number.');
  });
});
