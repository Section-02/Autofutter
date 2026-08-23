import { startDateForRange } from '../../src/domain/progress/progressRange';
import { subtractLocalMonths } from '../../src/utils/dates';

describe('progress ranges', () => {
  it('calculates all required calendar ranges', () => {
    expect(startDateForRange('1M', '2026-08-22')).toBe('2026-07-22');
    expect(startDateForRange('3M', '2026-08-22')).toBe('2026-05-22');
    expect(startDateForRange('6M', '2026-08-22')).toBe('2026-02-22');
    expect(startDateForRange('1Y', '2026-08-22')).toBe('2025-08-22');
    expect(startDateForRange('All', '2026-08-22')).toBeNull();
  });

  it('clamps end-of-month dates to a valid day', () => {
    expect(subtractLocalMonths('2026-03-31', 1)).toBe('2026-02-28');
    expect(subtractLocalMonths('2024-03-31', 1)).toBe('2024-02-29');
  });
});
