export const freedomVolumeUnits = ['teaspoon', 'tablespoon', 'cup'] as const;

export type FreedomVolumeUnit = (typeof freedomVolumeUnits)[number];

const teaspoonsPerUnit: Readonly<Record<FreedomVolumeUnit, number>> = {
  teaspoon: 1,
  tablespoon: 3,
  cup: 48,
};

/**
 * Converts between exact U.S. customary volume units only. This deliberately
 * does not convert volume to grams; that requires a food-specific portion.
 */
export function convertFreedomVolume(
  amount: number,
  from: FreedomVolumeUnit,
  to: FreedomVolumeUnit,
): number {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('Volume amount must be zero or greater.');
  }
  return (amount * teaspoonsPerUnit[from]) / teaspoonsPerUnit[to];
}
