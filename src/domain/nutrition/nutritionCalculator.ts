import type { LoggedNutrition, Nutrition } from './nutritionTypes';
import {
  assertCompleteNutrition,
  assertPositiveFinite,
} from './validation';

export function scaleNutrition(
  source: Nutrition,
  requestedWeightG: number,
  referenceWeightG: number,
): Nutrition {
  assertCompleteNutrition(source);
  assertPositiveFinite(requestedWeightG, 'Requested weight');
  assertPositiveFinite(referenceWeightG, 'Reference weight');

  const scale = requestedWeightG / referenceWeightG;

  return {
    calories: source.calories * scale,
    proteinG: source.proteinG * scale,
    fatG: source.fatG * scale,
    carbsG: source.carbsG * scale,
    sodiumMg: source.sodiumMg * scale,
    cholesterolMg: source.cholesterolMg * scale,
  };
}

export function addNutrition(left: Nutrition, right: Nutrition): Nutrition {
  assertCompleteNutrition(left);
  assertCompleteNutrition(right);

  return {
    calories: left.calories + right.calories,
    proteinG: left.proteinG + right.proteinG,
    fatG: left.fatG + right.fatG,
    carbsG: left.carbsG + right.carbsG,
    sodiumMg: left.sodiumMg + right.sodiumMg,
    cholesterolMg: left.cholesterolMg + right.cholesterolMg,
  };
}

export function roundLoggedNutrition(nutrition: Nutrition): LoggedNutrition {
  assertCompleteNutrition(nutrition);

  return {
    calories: Math.ceil(nutrition.calories),
    proteinG: Math.ceil(nutrition.proteinG),
    fatG: Math.ceil(nutrition.fatG),
    carbsG: Math.ceil(nutrition.carbsG),
    sodiumMg: Math.ceil(nutrition.sodiumMg),
    cholesterolMg: Math.ceil(nutrition.cholesterolMg),
  };
}
