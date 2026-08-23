import type { DatabaseConnection } from '@/data/database/types';
import {
  DailySummaryRepository,
  type DailySummaryRecord,
} from '@/data/repositories/dailySummaryRepository';
import {
  FoodLogRepository,
  type FoodLogEntryRecord,
} from '@/data/repositories/foodLogRepository';
import { GoalRepository } from '@/data/repositories/goalRepository';
import { LogDayCompletionRepository } from '@/data/repositories/logDayCompletionRepository';
import type { GoalValues } from '@/domain/goals/goalCalculator';
import { isDayAutomaticallyEnded } from '@/domain/logging/dayCompletion';
import { assertLocalDate } from '@/utils/dates';

export const INITIAL_GOAL_DEFAULTS: GoalValues = {
  calorieTarget: 2_000,
  proteinMinimumG: 160,
  calorieTolerancePercent: 10,
};

export type DayLogData = Readonly<{
  entries: FoodLogEntryRecord[];
  summary: DailySummaryRecord;
  goal: GoalValues;
  isUsingInitialGoalDefaults: boolean;
  dayEnded: boolean;
  dayEndedAutomatically: boolean;
}>;

type Options = Readonly<{ now?: () => Date }>;

function emptySummary(date: string): DailySummaryRecord {
  return {
    date,
    calories: 0,
    protein_g: 0,
    fat_g: 0,
    carbs_g: 0,
    sodium_mg: 0,
    cholesterol_mg: 0,
    has_partial_nutrition: 0,
    updated_at: '',
  };
}

export class LogQueryService {
  private readonly now: () => Date;

  constructor(private readonly database: DatabaseConnection, options: Options = {}) {
    this.now = options.now ?? (() => new Date());
  }

  async loadDay(date: string): Promise<DayLogData> {
    assertLocalDate(date);
    const [entries, storedSummary, storedGoal, completion] = await Promise.all([
      new FoodLogRepository(this.database).listByDate(date),
      new DailySummaryRepository(this.database).findByDate(date),
      new GoalRepository(this.database).findForDate(date),
      new LogDayCompletionRepository(this.database).findByDate(date),
    ]);
    const dayEndedAutomatically = isDayAutomaticallyEnded(date, this.now());

    return {
      entries,
      summary: storedSummary ?? emptySummary(date),
      goal:
        storedGoal === null
          ? INITIAL_GOAL_DEFAULTS
          : {
              calorieTarget: storedGoal.calorie_target,
              proteinMinimumG: storedGoal.protein_minimum_g,
              calorieTolerancePercent: storedGoal.calorie_tolerance_percent,
            },
      isUsingInitialGoalDefaults: storedGoal === null,
      dayEnded: completion !== null || dayEndedAutomatically,
      dayEndedAutomatically,
    };
  }
}
