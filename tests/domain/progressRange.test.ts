import { startDateForRange } from '../../src/domain/progress/progressRange';
import { subtractLocalMonths } from '../../src/utils/dates';

describe('progress ranges', () => {
  it('calculates all required calendar ranges', () => {
    expect(startDateForRange('1W', '2026-08-22')).toBe('2026-08-15');
    expect(startDateForRange('1M', '2026-08-22')).toBe('2026-07-22');
    expect(startDateForRange('6W', '2026-08-22')).toBe('2026-07-11');
    expect(startDateForRange('3M', '2026-08-22')).toBe('2026-05-22');
    expect(startDateForRange('All', '2026-08-22')).toBeNull();
  });

  it('clamps end-of-month dates to a valid day', () => {
    expect(subtractLocalMonths('2026-03-31', 1)).toBe('2026-02-28');
    expect(subtractLocalMonths('2024-03-31', 1)).toBe('2024-02-29');
  });
});
