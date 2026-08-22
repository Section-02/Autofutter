import {
  assertIntegerInRange,
  assertPositiveFinite,
} from '@/domain/nutrition/validation';

export type GoalValues = Readonly<{
  calorieTarget: number;
  proteinMinimumG: number;
  calorieTolerancePercent: number;
}>;

export type CalorieRange = Readonly<{
  lower: number;
  target: number;
  upper: number;
  tolerancePercent: number;
}>;

function assertPositiveInteger(value: number, label: string): void {
  assertPositiveFinite(value, label);
  if (!Number.isInteger(value)) {
    throw new RangeError(`${label} must be a whole number.`);
  }
}

export function assertValidGoal(goal: GoalValues): void {
  assertPositiveInteger(goal.calorieTarget, 'Calorie target');
  assertPositiveInteger(goal.proteinMinimumG, 'Protein minimum');
  assertIntegerInRange(
    goal.calorieTolerancePercent,
    0,
    100,
    'Calorie tolerance percent',
  );
}

export function calculateCalorieRange(
  calorieTarget: number,
  tolerancePercent: number,
): CalorieRange {
  assertPositiveInteger(calorieTarget, 'Calorie target');
  assertIntegerInRange(
    tolerancePercent,
    0,
    100,
    'Calorie tolerance percent',
  );

  const toleranceCalories = (calorieTarget * tolerancePercent) / 100;

  return {
    lower: calorieTarget - toleranceCalories,
    target: calorieTarget,
    upper: calorieTarget + toleranceCalories,
    tolerancePercent,
  };
}
