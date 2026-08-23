import type { DatabaseConnection } from '@/data/database/types';
import { DailySummaryRepository, type DailySummaryRecord } from '@/data/repositories/dailySummaryRepository';
import { GoalRepository, type GoalRecord } from '@/data/repositories/goalRepository';
import { LogDayCompletionRepository } from '@/data/repositories/logDayCompletionRepository';
import { WeightRepository, type WeightRecord } from '@/data/repositories/weightRepository';
import { calculateCalorieRange } from '@/domain/goals/goalCalculator';
import { isDayAutomaticallyEnded } from '@/domain/logging/dayCompletion';
import { startDateForRange, type ProgressRange } from '@/domain/progress/progressRange';
import { INITIAL_GOAL_DEFAULTS } from '@/services/logging/logQueryService';

export type CalorieProgressPoint = Readonly<{
  date: string;
  calories: number;
  target: number;
  lower: number;
  upper: number;
  hasPartialNutrition: boolean;
}>;

export type WeightProgressSummary = Readonly<{
  current: number | null;
  starting: number | null;
  totalChange: number | null;
}>;

export type ProgressGoalPoint = Readonly<{
  effectiveDate: string;
  target: number;
  lower: number;
  upper: number;
}>;

export type ProgressData = Readonly<{
  startDate: string | null;
  endDate: string;
  weights: WeightRecord[];
  calories: CalorieProgressPoint[];
  goals: ProgressGoalPoint[];
  weightSummary: WeightProgressSummary;
}>;

type Options = Readonly<{ now?: () => Date }>;

function goalForDate(goals: GoalRecord[], date: string): GoalRecord | null {
  let result: GoalRecord | null = null;
  for (const goal of goals) {
    if (goal.effective_date > date) break;
    result = goal;
  }
  return result;
}

function caloriePoint(summary: DailySummaryRecord, goals: GoalRecord[]): CalorieProgressPoint {
  const storedGoal = goalForDate(goals, summary.date);
  const target = storedGoal?.calorie_target ?? INITIAL_GOAL_DEFAULTS.calorieTarget;
  const tolerance = storedGoal?.calorie_tolerance_percent ?? INITIAL_GOAL_DEFAULTS.calorieTolerancePercent;
  const range = calculateCalorieRange(target, tolerance);
  return {
    date: summary.date,
    calories: summary.calories,
    target,
    lower: range.lower,
    upper: range.upper,
    hasPartialNutrition: summary.has_partial_nutrition === 1,
  };
}

export class ProgressService {
  private readonly now: () => Date;

  constructor(private readonly database: DatabaseConnection, options: Options = {}) {
    this.now = options.now ?? (() => new Date());
  }

  async load(range: ProgressRange): Promise<ProgressData> {
    const now = this.now();
    const endDate = todayLocalDateAt(now);
    const startDate = startDateForRange(range, endDate);
    const [weights, allWeights, summaries, completions, goals] = await Promise.all([
      new WeightRepository(this.database).listBetween(startDate, endDate),
      new WeightRepository(this.database).listAll(),
      new DailySummaryRepository(this.database).listBetween(startDate, endDate),
      new LogDayCompletionRepository(this.database).listBetween(startDate, endDate),
      new GoalRepository(this.database).listThrough(endDate),
    ]);
    const manualDates = new Set(completions.map(({ date }) => date));
    const summaryByDate = new Map(summaries.map((summary) => [summary.date, summary]));
    for (const date of manualDates) {
      if (!summaryByDate.has(date)) {
        summaryByDate.set(date, {
          date, calories: 0, protein_g: 0, fat_g: 0, carbs_g: 0,
          sodium_mg: 0, cholesterol_mg: 0, has_partial_nutrition: 0, updated_at: '',
        });
      }
    }
    const calories = [...summaryByDate.values()]
      .filter((summary) => manualDates.has(summary.date) || isDayAutomaticallyEnded(summary.date, now))
      .sort((left, right) => left.date.localeCompare(right.date))
      .map((summary) => caloriePoint(summary, goals));
    const progressGoals = goals.map((goal) => {
      const range = calculateCalorieRange(goal.calorie_target, goal.calorie_tolerance_percent);
      return {
        effectiveDate: goal.effective_date,
        target: goal.calorie_target,
        lower: range.lower,
        upper: range.upper,
      };
    });
    const starting = allWeights[0]?.weight_lb ?? null;
    const current = allWeights.at(-1)?.weight_lb ?? null;
    return {
      startDate,
      endDate,
      weights,
      calories,
      goals: progressGoals,
      weightSummary: {
        starting,
        current,
        totalChange: starting === null || current === null ? null : current - starting,
      },
    };
  }
}

function todayLocalDateAt(now: Date): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
