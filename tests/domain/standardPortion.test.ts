import { standardPortionQuantityToGrams } from '../../src/domain/nutrition/standardPortion';

describe('standard portion conversion', () => {
  it('converts a portion count to canonical grams without rounding', () => {
    expect(standardPortionQuantityToGrams(2.5, 28.35)).toBeCloseTo(70.875, 10);
  });

  it('rejects invalid quantities and portion weights', () => {
    expect(() => standardPortionQuantityToGrams(0, 28)).toThrow();
    expect(() => standardPortionQuantityToGrams(1, Number.NaN)).toThrow();
  });
});
