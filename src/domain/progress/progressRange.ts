import { addLocalDays, subtractLocalMonths } from '@/utils/dates';

export type ProgressRange = '1W' | '1M' | '6W' | '3M' | 'All';
export type ProgressMode = 'Weight' | 'Calories' | 'Both';

export function startDateForRange(range: ProgressRange, endDate: string): string | null {
  switch (range) {
    case '1W': return addLocalDays(endDate, -7);
    case '1M': return subtractLocalMonths(endDate, 1);
    case '3M': return subtractLocalMonths(endDate, 3);
    case '6W': return addLocalDays(endDate, -42);
    case 'All': return null;
  }
}
