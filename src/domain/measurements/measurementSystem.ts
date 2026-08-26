export const measurementSystems = ['grams', 'freedom'] as const;

export type MeasurementSystem = (typeof measurementSystems)[number];

export function measurementSystemLabel(system: MeasurementSystem): string {
  return system === 'grams' ? 'Grams' : 'Freedom Units';
}
