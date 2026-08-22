import type { UsdaFoodCandidate, UsdaNutrition } from './usdaTypes';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(record: UnknownRecord, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readNumber(record: UnknownRecord, key: string): number | null {
  const value = record[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function nutrientRecord(value: unknown): UnknownRecord | null {
  if (!isRecord(value)) return null;
  const nested = value.nutrient;
  if (!isRecord(nested)) return value;
  return {
    ...value,
    nutrientId: nested.id ?? value.nutrientId,
    nutrientNumber: nested.number ?? value.nutrientNumber,
    nutrientName: nested.name ?? value.nutrientName,
    unitName: nested.unitName ?? value.unitName,
  };
}

function findNutrient(
  rawNutrients: readonly unknown[],
  identifiers: Readonly<{
    ids: readonly number[];
    numbers: readonly string[];
    names: readonly string[];
    requiredUnit?: string;
  }>,
): number | null {
  for (const value of rawNutrients) {
    const nutrient = nutrientRecord(value);
    if (nutrient === null) continue;
    const id = readNumber(nutrient, 'nutrientId');
    const number = readString(nutrient, 'nutrientNumber');
    const name = readString(nutrient, 'nutrientName')?.toLowerCase();
    const unit = readString(nutrient, 'unitName')?.toLowerCase();
    const matches =
      (id !== null && identifiers.ids.includes(id)) ||
      (number !== null && identifiers.numbers.includes(number)) ||
      (name !== undefined && name !== null && identifiers.names.includes(name));
    if (!matches) continue;
    if (identifiers.requiredUnit && unit !== identifiers.requiredUnit.toLowerCase()) {
      continue;
    }
    const amount = readNumber(nutrient, 'value') ?? readNumber(nutrient, 'amount');
    if (amount !== null && amount >= 0) return amount;
  }
  return null;
}

function mapNutrition(rawNutrients: readonly unknown[]): UsdaNutrition {
  return {
    calories:
      findNutrient(rawNutrients, {
        ids: [2048],
        numbers: ['958'],
        names: ['energy (atwater specific factors)', 'metabolizable energy (atwater specific factor)'],
        requiredUnit: 'kcal',
      }) ??
      findNutrient(rawNutrients, {
        ids: [2047],
        numbers: ['957'],
        names: ['energy (atwater general factors)', 'metabolizable energy (atwater general factor)'],
        requiredUnit: 'kcal',
      }) ??
      findNutrient(rawNutrients, {
        ids: [1008],
        numbers: ['208'],
        names: ['energy'],
        requiredUnit: 'kcal',
      }),
    proteinG: findNutrient(rawNutrients, {
      ids: [1003],
      numbers: ['203'],
      names: ['protein'],
    }),
    fatG: findNutrient(rawNutrients, {
      ids: [1004],
      numbers: ['204'],
      names: ['total lipid (fat)', 'total fat'],
    }),
    carbsG: findNutrient(rawNutrients, {
      ids: [1005],
      numbers: ['205'],
      names: ['carbohydrate, by difference', 'carbohydrate'],
    }),
    sodiumMg: findNutrient(rawNutrients, {
      ids: [1093],
      numbers: ['307'],
      names: ['sodium, na', 'sodium'],
    }),
    cholesterolMg: findNutrient(rawNutrients, {
      ids: [1253],
      numbers: ['601'],
      names: ['cholesterol'],
    }),
  };
}

function scaleNullable(value: number | null, factor: number): number | null {
  return value === null ? null : value * factor;
}

export function mapUsdaFood(value: unknown): UsdaFoodCandidate | null {
  if (!isRecord(value)) return null;
  const fdcId = readNumber(value, 'fdcId');
  const name = readString(value, 'description');
  if (fdcId === null || name === null) return null;

  const nutrients = Array.isArray(value.foodNutrients) ? value.foodNutrients : [];
  const per100g = mapNutrition(nutrients);
  const servingSize = readNumber(value, 'servingSize');
  const servingUnit = readString(value, 'servingSizeUnit')?.toLowerCase();
  const referenceWeightG =
    servingSize !== null && servingSize > 0 && (servingUnit === 'g' || servingUnit === 'gram')
      ? servingSize
      : 100;
  const factor = referenceWeightG / 100;

  return {
    fdcId: String(fdcId),
    name,
    dataType: readString(value, 'dataType') ?? 'USDA',
    brandOwner: readString(value, 'brandOwner') ?? readString(value, 'brandName'),
    referenceWeightG,
    nutrition: {
      calories: scaleNullable(per100g.calories, factor),
      proteinG: scaleNullable(per100g.proteinG, factor),
      fatG: scaleNullable(per100g.fatG, factor),
      carbsG: scaleNullable(per100g.carbsG, factor),
      sodiumMg: scaleNullable(per100g.sodiumMg, factor),
      cholesterolMg: scaleNullable(per100g.cholesterolMg, factor),
    },
  };
}

export function mapUsdaSearchResponse(value: unknown): UsdaFoodCandidate[] {
  if (!isRecord(value) || !Array.isArray(value.foods)) return [];
  return value.foods
    .map(mapUsdaFood)
    .filter((food): food is UsdaFoodCandidate => food !== null);
}
