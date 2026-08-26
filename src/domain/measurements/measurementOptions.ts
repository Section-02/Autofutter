import { convertFreedomVolume, type FreedomVolumeUnit } from './freedomUnits';
import type { MeasurementSystem } from './measurementSystem';

export const GRAMS_PER_OUNCE = 28.349523125;
export const GRAMS_PER_POUND = 453.59237;

export type PortionConversion = Readonly<{
  key: string;
  label: string;
  amount: number;
  gramWeightG: number;
  volumeUnit: FreedomVolumeUnit | null;
}>;

export type MeasurementOption = Readonly<{
  key: string;
  label: string;
  gramsPerUnit: number;
}>;

type StandardPortion = Readonly<{ label: string; weightG: number }>;

function shortVolumeLabel(unit: FreedomVolumeUnit): string {
  if (unit === 'tablespoon') return 'tbsp';
  if (unit === 'teaspoon') return 'tsp';
  return 'cup';
}

function descriptor(label: string): string {
  return label
    .replace(/\b(cups?|tablespoons?|tbsp|tbs|tb|teaspoons?|tsp)\b/i, '')
    .replace(/^\s*,\s*/, '')
    .trim();
}

function volumeOptions(portion: PortionConversion): MeasurementOption[] {
  if (portion.volumeUnit === null) return [];
  const sourceUnit = portion.volumeUnit;
  const gramsPerSourceUnit = portion.gramWeightG / portion.amount;
  const suffix = descriptor(portion.label);
  const units: readonly FreedomVolumeUnit[] = ['cup', 'tablespoon', 'teaspoon'];
  return units.map((unit) => {
    const short = shortVolumeLabel(unit);
    return {
      key: `${portion.key}:${unit}`,
      label: suffix ? `${short}, ${suffix}` : short,
      gramsPerUnit:
        convertFreedomVolume(1, unit, sourceUnit) * gramsPerSourceUnit,
    };
  });
}

function uniqueOptions(options: readonly MeasurementOption[]): MeasurementOption[] {
  const seen = new Set<string>();
  return options.filter((option) => {
    const key = `${option.label.toLowerCase()}|${option.gramsPerUnit.toFixed(9)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildFoodMeasurementOptions(
  system: MeasurementSystem,
  portions: readonly PortionConversion[],
  standardPortion: StandardPortion | null,
): MeasurementOption[] {
  const grams: MeasurementOption = { key: 'grams', label: 'g', gramsPerUnit: 1 };
  const standard = standardPortion === null
    ? []
    : [{ key: 'standard', label: standardPortion.label, gramsPerUnit: standardPortion.weightG }];
  if (system === 'grams') return [grams, ...standard];

  const foodSpecific = portions.flatMap((portion) =>
    portion.volumeUnit === null
      ? [{
          key: portion.key,
          label: portion.label,
          gramsPerUnit: portion.gramWeightG / portion.amount,
        }]
      : volumeOptions(portion),
  );
  return uniqueOptions([
    ...foodSpecific,
    ...standard,
    { key: 'ounces', label: 'oz', gramsPerUnit: GRAMS_PER_OUNCE },
    { key: 'pounds', label: 'lb', gramsPerUnit: GRAMS_PER_POUND },
    grams,
  ]);
}

export function buildMassMeasurementOptions(system: MeasurementSystem): MeasurementOption[] {
  return system === 'grams'
    ? [{ key: 'grams', label: 'g', gramsPerUnit: 1 }]
    : [
        { key: 'ounces', label: 'oz', gramsPerUnit: GRAMS_PER_OUNCE },
        { key: 'pounds', label: 'lb', gramsPerUnit: GRAMS_PER_POUND },
        { key: 'grams', label: 'g', gramsPerUnit: 1 },
      ];
}

export function amountToGrams(amount: number, option: MeasurementOption): number {
  return amount * option.gramsPerUnit;
}

export function gramsToAmount(grams: number, option: MeasurementOption): number {
  return grams / option.gramsPerUnit;
}

export function displayMeasurementAmount(value: number): string {
  return String(Number(value.toFixed(6)));
}
