import { subtractLocalMonths } from '@/utils/dates';

export type ProgressRange = '1M' | '3M' | '6M' | '1Y' | 'All';
export type ProgressMode = 'Weight' | 'Calories' | 'Both';

export function startDateForRange(range: ProgressRange, endDate: string): string | null {
  switch (range) {
    case '1M': return subtractLocalMonths(endDate, 1);
    case '3M': return subtractLocalMonths(endDate, 3);
    case '6M': return subtractLocalMonths(endDate, 6);
    case '1Y': return subtractLocalMonths(endDate, 12);
    case 'All': return null;
  }
}
