import {
  roundLoggedNutrition,
  scaleNutrition,
} from '../../src/domain/nutrition/nutritionCalculator';
import {
  calculateRecipeNutrition,
  calculateRecipePortion,
} from '../../src/domain/nutrition/recipeCalculator';
import type {
  Nutrition,
  WeightedIngredient,
} from '../../src/domain/nutrition/nutritionTypes';

const firstNutrition: Nutrition = {
  calories: 101.25,
  proteinG: 9.125,
  fatG: 2.5,
  carbsG: 11.75,
  sodiumMg: 187.4,
  cholesterolMg: 16.2,
};

const secondNutrition: Nutrition = {
  calories: 254.4,
  proteinG: 19.75,
  fatG: 20.2,
  carbsG: 0.125,
  sodiumMg: 72.6,
  cholesterolMg: 66.6,
};

const ingredients: readonly WeightedIngredient[] = [
  {
    id: 'first',
    foodId: 'food-first',
    referenceWeightG: 33.333,
    weightG: 187,
    nutrition: firstNutrition,
  },
  {
    id: 'second',
    foodId: 'food-second',
    referenceWeightG: 112,
    weightG: 73.4,
    nutrition: secondNutrition,
  },
];

describe('recipeCalculator', () => {
  it('sums exact scaled ingredient nutrition for all six nutrients', () => {
    const total = calculateRecipeNutrition(ingredients);
    const firstFactor = 187 / 33.333;
    const secondFactor = 73.4 / 112;

    expect(total.calories).toBeCloseTo(
      firstNutrition.calories * firstFactor +
        secondNutrition.calories * secondFactor,
      12,
    );
    expect(total.proteinG).toBeCloseTo(
      firstNutrition.proteinG * firstFactor +
        secondNutrition.proteinG * secondFactor,
      12,
    );
    expect(total.fatG).toBeCloseTo(
      firstNutrition.fatG * firstFactor + secondNutrition.fatG * secondFactor,
      12,
    );
    expect(total.carbsG).toBeCloseTo(
      firstNutrition.carbsG * firstFactor +
        secondNutrition.carbsG * secondFactor,
      12,
    );
    expect(total.sodiumMg).toBeCloseTo(
      firstNutrition.sodiumMg * firstFactor +
        secondNutrition.sodiumMg * secondFactor,
      12,
    );
    expect(total.cholesterolMg).toBeCloseTo(
      firstNutrition.cholesterolMg * firstFactor +
        secondNutrition.cholesterolMg * secondFactor,
      12,
    );
  });

  it('uses finished recipe weight to calculate an exact 187 g portion', () => {
    const total = calculateRecipeNutrition(ingredients);
    const portion = calculateRecipePortion(total, 187, 1_653);

    expect(portion.calories).toBeCloseTo(total.calories * (187 / 1_653), 12);
    expect(portion.proteinG).toBeCloseTo(total.proteinG * (187 / 1_653), 12);
    expect(portion.fatG).toBeCloseTo(total.fatG * (187 / 1_653), 12);
    expect(portion.carbsG).toBeCloseTo(total.carbsG * (187 / 1_653), 12);
    expect(portion.sodiumMg).toBeCloseTo(total.sodiumMg * (187 / 1_653), 12);
    expect(portion.cholesterolMg).toBeCloseTo(
      total.cholesterolMg * (187 / 1_653),
      12,
    );
  });

  it('rounds only the final portion instead of each ingredient intermediate', () => {
    const exactTotal = calculateRecipeNutrition(ingredients);
    const exactPortion = calculateRecipePortion(exactTotal, 146, 1_653);
    const logged = roundLoggedNutrition(exactPortion);

    const firstFactor = 187 / 33.333;
    const secondFactor = 73.4 / 112;
    const portionFactor = 146 / 1_653;
    const expectedExactCalories =
      (firstNutrition.calories * firstFactor +
        secondNutrition.calories * secondFactor) *
      portionFactor;

    expect(exactPortion.calories).toBeCloseTo(expectedExactCalories, 12);
    expect(logged.calories).toBe(Math.ceil(expectedExactCalories));

    const prematurelyRoundedTotal = roundLoggedNutrition(
      scaleNutrition(firstNutrition, 187, 33.333),
    ).calories +
      roundLoggedNutrition(
        scaleNutrition(secondNutrition, 73.4, 112),
      ).calories;
    const prematurelyRoundedResult = Math.ceil(
      prematurelyRoundedTotal * portionFactor,
    );

    expect(logged.calories).not.toBe(prematurelyRoundedResult);
  });

  it('rejects zero or negative ingredient, portion, and finished weights', () => {
    expect(() =>
      calculateRecipeNutrition([{ ...ingredients[0]!, weightG: 0 }]),
    ).toThrow('Ingredient weight must be a positive finite number.');
    expect(() =>
      calculateRecipePortion(calculateRecipeNutrition(ingredients), 0, 1_653),
    ).toThrow('Portion weight must be a positive finite number.');
    expect(() =>
      calculateRecipePortion(calculateRecipeNutrition(ingredients), 187, -1),
    ).toThrow('Finished weight must be a positive finite number.');
  });
});
