import {
  assertValidGoal,
  calculateCalorieRange,
} from '../../src/domain/goals/goalCalculator';

describe('goalCalculator', () => {
  it('calculates the exact lower and upper tolerance boundaries', () => {
    expect(calculateCalorieRange(2_000, 10)).toEqual({
      lower: 1_800,
      target: 2_000,
      upper: 2_200,
      tolerancePercent: 10,
    });
    expect(calculateCalorieRange(1_600, 15)).toEqual({
      lower: 1_360,
      target: 1_600,
      upper: 1_840,
      tolerancePercent: 15,
    });
  });

  it('retains fractional boundaries instead of rounding them', () => {
    expect(calculateCalorieRange(1_653, 7)).toEqual({
      lower: 1_537.29,
      target: 1_653,
      upper: 1_768.71,
      tolerancePercent: 7,
    });
  });

  it('supports a zero-percent tolerance at the exact target', () => {
    expect(calculateCalorieRange(2_000, 0)).toEqual({
      lower: 2_000,
      target: 2_000,
      upper: 2_000,
      tolerancePercent: 0,
    });
  });

  it('validates calorie, protein, and whole-percentage goal values', () => {
    expect(() =>
      assertValidGoal({
        calorieTarget: 2_000,
        proteinMinimumG: 160,
        calorieTolerancePercent: 10,
      }),
    ).not.toThrow();

    expect(() => calculateCalorieRange(0, 10)).toThrow(
      'Calorie target must be a positive finite number.',
    );
    expect(() => calculateCalorieRange(2_000, 10.5)).toThrow(
      'Calorie tolerance percent must be an integer from 0 to 100.',
    );
    expect(() =>
      assertValidGoal({
        calorieTarget: 2_000,
        proteinMinimumG: 0,
        calorieTolerancePercent: 10,
      }),
    ).toThrow('Protein minimum must be a positive finite number.');
  });
});
