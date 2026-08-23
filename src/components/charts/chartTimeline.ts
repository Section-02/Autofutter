import type { WeightRecord } from '@/data/repositories/weightRepository';
import type { CalorieProgressPoint, ProgressGoalPoint } from '@/services/progress/progressService';
import { addLocalDays, parseLocalDate } from '@/utils/dates';

export function timelineDates(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  for (let date = startDate; date <= endDate; date = addLocalDays(date, 1)) dates.push(date);
  return dates;
}

export function chartStartDate(
  requestedStart: string | null,
  endDate: string,
  weights: readonly WeightRecord[] = [],
  calories: readonly CalorieProgressPoint[] = [],
): string {
  if (requestedStart !== null) return requestedStart;
  const candidates = [weights[0]?.date, calories[0]?.date].filter((value): value is string => value !== undefined);
  return candidates.sort()[0] ?? endDate;
}

export function formatChartDate(date: string): string {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(parseLocalDate(date));
}

export function weightScale(values: readonly number[]): { offset: number; span: number } {
  if (values.length === 0) return { offset: 0, span: 10 };
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const padding = Math.max(2, (maximum - minimum) * 0.2);
  const offset = Math.max(0, Math.floor(minimum - padding));
  return { offset, span: Math.max(5, Math.ceil(maximum + padding - offset)) };
}

export function calorieScale(values: readonly number[]): number {
  const maximum = Math.max(500, ...values);
  return Math.ceil(maximum / 500) * 500;
}

export function goalForTimelineDate(goals: readonly ProgressGoalPoint[], date: string): ProgressGoalPoint {
  let current: ProgressGoalPoint = { effectiveDate: '', target: 2000, lower: 1800, upper: 2200 };
  for (const goal of goals) {
    if (goal.effectiveDate > date) break;
    current = goal;
  }
  return current;
}
