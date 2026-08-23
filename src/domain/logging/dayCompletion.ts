import { parseLocalDate } from '@/utils/dates';

export function isDayAutomaticallyEnded(logDate: string, now: Date): boolean {
  const cutoff = parseLocalDate(logDate);
  cutoff.setDate(cutoff.getDate() + 1);
  cutoff.setHours(2, 0, 0, 0);
  return now.getTime() >= cutoff.getTime();
}
