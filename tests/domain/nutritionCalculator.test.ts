import {
  addNutrition,
  roundLoggedNutrition,
  scaleNutrition,
} from '../../src/domain/nutrition/nutritionCalculator';
import type { Nutrition } from '../../src/domain/nutrition/nutritionTypes';

const decimalNutrition: Nutrition = {
  calories: 101.25,
  proteinG: 9.125,
  fatG: 2.5,
  carbsG: 11.75,
  sodiumMg: 187.4,
  cholesterolMg: 16.2,
};

describe('nutritionCalculator', () => {
  it('returns all six source nutrients at the reference weight', () => {
    expect(scaleNutrition(decimalNutrition, 33.333, 33.333)).toEqual(
      decimalNutrition,
    );
  });

  it('scales an arbitrary 187 g portion while retaining decimal precision', () => {
    const scaled = scaleNutrition(decimalNutrition, 187, 33.333);
    const factor = 187 / 33.333;

    expect(scaled.calories).toBeCloseTo(101.25 * factor, 12);
    expect(scaled.proteinG).toBeCloseTo(9.125 * factor, 12);
    expect(scaled.fatG).toBeCloseTo(2.5 * factor, 12);
    expect(scaled.carbsG).toBeCloseTo(11.75 * factor, 12);
    expect(scaled.sodiumMg).toBeCloseTo(187.4 * factor, 12);
    expect(scaled.cholesterolMg).toBeCloseTo(16.2 * factor, 12);
  });

  it('adds exact nutrition without rounding either operand', () => {
    const result = addNutrition(decimalNutrition, {
      calories: 0.125,
      proteinG: 0.375,
      fatG: 0.625,
      carbsG: 0.875,
      sodiumMg: 0.225,
      cholesterolMg: 0.425,
    });

    expect(result).toEqual({
      calories: 101.375,
      proteinG: 9.5,
      fatG: 3.125,
      carbsG: 12.625,
      sodiumMg: 187.625,
      cholesterolMg: 16.625,
    });
  });

  it('rounds every final logged nutrient upward and leaves integers unchanged', () => {
    expect(
      roundLoggedNutrition({
        calories: 100,
        proteinG: 100.01,
        fatG: 100.5,
        carbsG: 100.99,
        sodiumMg: 0,
        cholesterolMg: 2.0001,
      }),
    ).toEqual({
      calories: 100,
      proteinG: 101,
      fatG: 101,
      carbsG: 101,
      sodiumMg: 0,
      cholesterolMg: 3,
    });
  });

  it('rejects invalid weights and nutrient values', () => {
    expect(() => scaleNutrition(decimalNutrition, 0, 33.333)).toThrow(
      'Requested weight must be a positive finite number.',
    );
    expect(() => scaleNutrition(decimalNutrition, 10, -1)).toThrow(
      'Reference weight must be a positive finite number.',
    );
    expect(() =>
      scaleNutrition({ ...decimalNutrition, sodiumMg: -0.1 }, 10, 20),
    ).toThrow('Sodium must be a non-negative finite number.');
  });
});
