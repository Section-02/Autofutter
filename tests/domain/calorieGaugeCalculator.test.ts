import { calculateGaugeState } from '../../src/domain/nutrition/calorieGaugeCalculator';

describe('calorieGaugeCalculator', () => {
  it('is green immediately below the lower boundary', () => {
    expect(calculateGaugeState(1_799.99, 2_000, 10)).toMatchObject({
      band: 'below',
      normalArcColor: 'green',
      normalProgress: 1_799.99 / 2_000,
      redExtensionCalories: 0,
      balance: { kind: 'left', calories: 200.01 },
    });
  });

  it('becomes orange exactly at the lower boundary', () => {
    expect(calculateGaugeState(1_800, 2_000, 10)).toMatchObject({
      band: 'acceptable',
      normalArcColor: 'orange',
      normalProgress: 0.9,
      redExtensionCalories: 0,
    });
  });

  it('fills the normal arc exactly at the target', () => {
    expect(calculateGaugeState(2_000, 2_000, 10)).toMatchObject({
      band: 'acceptable',
      normalProgress: 1,
      redExtensionCalories: 0,
      balance: { kind: 'left', calories: 0 },
    });
  });

  it('keeps the full orange normal arc through the exact upper boundary', () => {
    expect(calculateGaugeState(2_200, 2_000, 10)).toMatchObject({
      band: 'acceptable',
      normalArcColor: 'orange',
      normalProgress: 1,
      redExtensionCalories: 0,
      balance: { kind: 'over', calories: 200 },
    });
  });

  it('starts a red extension only above the upper boundary and never wraps', () => {
    expect(calculateGaugeState(2_250, 2_000, 10)).toMatchObject({
      band: 'over',
      normalArcColor: 'orange',
      normalProgress: 1,
      redExtensionCalories: 50,
      balance: { kind: 'over', calories: 250 },
    });
  });

  it('changes the red threshold without changing where normal full occurs', () => {
    const tenPercent = calculateGaugeState(2_150, 2_000, 10);
    const fivePercent = calculateGaugeState(2_150, 2_000, 5);

    expect(tenPercent.band).toBe('acceptable');
    expect(fivePercent.band).toBe('over');
    expect(tenPercent.normalProgress).toBe(1);
    expect(fivePercent.normalProgress).toBe(1);
    expect(fivePercent.redExtensionCalories).toBe(50);
  });

  it('rejects negative or non-finite consumed calories', () => {
    expect(() => calculateGaugeState(-1, 2_000, 10)).toThrow(
      'Consumed calories must be a non-negative finite number.',
    );
    expect(() => calculateGaugeState(Number.NaN, 2_000, 10)).toThrow(
      'Consumed calories must be a non-negative finite number.',
    );
  });
});
