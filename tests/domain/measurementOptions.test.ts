import {
  GRAMS_PER_OUNCE,
  GRAMS_PER_POUND,
  amountToGrams,
  buildFoodMeasurementOptions,
  buildMassMeasurementOptions,
  gramsToAmount,
} from '../../src/domain/measurements/measurementOptions';

describe('preferred measurement options', () => {
  it('preserves grams as the primary grams-mode measurement', () => {
    expect(buildFoodMeasurementOptions('grams', [], { label: 'slice', weightG: 28 })).toEqual([
      { key: 'grams', label: 'g', gramsPerUnit: 1 },
      { key: 'standard', label: 'slice', gramsPerUnit: 28 },
    ]);
  });

  it('derives safe cup, tablespoon, and teaspoon options from a food-specific USDA portion', () => {
    const options = buildFoodMeasurementOptions('freedom', [{
      key: 'usda:0',
      label: 'cup, chopped',
      amount: 0.5,
      gramWeightG: 44,
      volumeUnit: 'cup',
    }], null);

    expect(options.find(({ label }) => label === 'cup, chopped')?.gramsPerUnit).toBeCloseTo(88, 10);
    expect(options.find(({ label }) => label === 'tbsp, chopped')?.gramsPerUnit).toBeCloseTo(5.5, 10);
    expect(options.find(({ label }) => label === 'tsp, chopped')?.gramsPerUnit).toBeCloseTo(88 / 48, 10);
  });

  it('never invents volume conversions when a food has no known portion', () => {
    const options = buildFoodMeasurementOptions('freedom', [], null);

    expect(options.map(({ label }) => label)).toEqual(['oz', 'lb', 'g']);
    expect(options.some(({ label }) => ['cup', 'tbsp', 'tsp'].includes(label))).toBe(false);
  });

  it('keeps a custom standard portion and grams fallback in Freedom Units', () => {
    const options = buildFoodMeasurementOptions('freedom', [], { label: 'slice', weightG: 28 });

    expect(options[0]).toEqual({ key: 'standard', label: 'slice', gramsPerUnit: 28 });
    expect(options.at(-1)).toEqual({ key: 'grams', label: 'g', gramsPerUnit: 1 });
  });

  it('uses exact ounce and pound mass conversions', () => {
    const options = buildMassMeasurementOptions('freedom');
    const ounces = options.find(({ key }) => key === 'ounces')!;
    const pounds = options.find(({ key }) => key === 'pounds')!;

    expect(amountToGrams(1, ounces)).toBe(GRAMS_PER_OUNCE);
    expect(amountToGrams(1, pounds)).toBe(GRAMS_PER_POUND);
    expect(gramsToAmount(GRAMS_PER_POUND, pounds)).toBe(1);
  });
});
