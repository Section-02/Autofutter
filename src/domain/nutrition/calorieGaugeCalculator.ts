import {
  calculateCalorieRange,
  type CalorieRange,
} from '@/domain/goals/goalCalculator';
import { assertNonNegativeFinite } from './validation';

export type CalorieGaugeBand = 'below' | 'acceptable' | 'over';
export type CalorieGaugeNormalColor = 'green' | 'orange';

export type CalorieBalance = Readonly<{
  kind: 'left' | 'over';
  calories: number;
}>;

export type CalorieGaugeState = Readonly<{
  consumedCalories: number;
  range: CalorieRange;
  band: CalorieGaugeBand;
  normalProgress: number;
  normalArcColor: CalorieGaugeNormalColor;
  redExtensionCalories: number;
  balance: CalorieBalance;
}>;

export function calculateGaugeState(
  consumedCalories: number,
  calorieTarget: number,
  tolerancePercent: number,
): CalorieGaugeState {
  assertNonNegativeFinite(consumedCalories, 'Consumed calories');
  const range = calculateCalorieRange(calorieTarget, tolerancePercent);

  const band: CalorieGaugeBand =
    consumedCalories < range.lower
      ? 'below'
      : consumedCalories <= range.upper
        ? 'acceptable'
        : 'over';

  const balance: CalorieBalance =
    consumedCalories <= calorieTarget
      ? { kind: 'left', calories: calorieTarget - consumedCalories }
      : { kind: 'over', calories: consumedCalories - calorieTarget };

  return {
    consumedCalories,
    range,
    band,
    normalProgress: Math.min(consumedCalories / calorieTarget, 1),
    normalArcColor: band === 'below' ? 'green' : 'orange',
    redExtensionCalories:
      band === 'over' ? consumedCalories - range.upper : 0,
    balance,
  };
}
