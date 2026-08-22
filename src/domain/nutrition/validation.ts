import type { Nutrition } from './nutritionTypes';

export function assertPositiveFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive finite number.`);
  }
}

export function assertNonNegativeFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative finite number.`);
  }
}

export function assertCompleteNutrition(nutrition: Nutrition): void {
  assertNonNegativeFinite(nutrition.calories, 'Calories');
  assertNonNegativeFinite(nutrition.proteinG, 'Protein');
  assertNonNegativeFinite(nutrition.fatG, 'Total fat');
  assertNonNegativeFinite(nutrition.carbsG, 'Carbohydrates');
  assertNonNegativeFinite(nutrition.sodiumMg, 'Sodium');
  assertNonNegativeFinite(nutrition.cholesterolMg, 'Cholesterol');
}

export function assertNonEmptyId(value: string, label: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${label} must not be empty.`);
  }
}

export function assertIntegerInRange(
  value: number,
  minimum: number,
  maximum: number,
  label: string,
): void {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${label} must be an integer from ${minimum} to ${maximum}.`);
  }
}
