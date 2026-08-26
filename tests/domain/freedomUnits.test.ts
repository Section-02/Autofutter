import { convertFreedomVolume } from '../../src/domain/measurements/freedomUnits';

describe('Freedom Units volume relationships', () => {
  it('uses exact teaspoon, tablespoon, and cup relationships', () => {
    expect(convertFreedomVolume(1, 'cup', 'tablespoon')).toBe(16);
    expect(convertFreedomVolume(1, 'tablespoon', 'teaspoon')).toBe(3);
    expect(convertFreedomVolume(1, 'cup', 'teaspoon')).toBe(48);
  });

  it('converts fractions and round-trips without involving grams', () => {
    expect(convertFreedomVolume(0.5, 'cup', 'tablespoon')).toBe(8);
    expect(convertFreedomVolume(6, 'teaspoon', 'tablespoon')).toBe(2);
    expect(convertFreedomVolume(48, 'teaspoon', 'cup')).toBe(1);
  });

  it('rejects negative and non-finite amounts', () => {
    expect(() => convertFreedomVolume(-1, 'cup', 'teaspoon')).toThrow();
    expect(() => convertFreedomVolume(Number.NaN, 'cup', 'teaspoon')).toThrow();
  });
});
