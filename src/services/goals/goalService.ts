import { randomUUID } from 'expo-crypto';

import type { DatabaseConnection } from '@/data/database/types';
import { GoalRepository } from '@/data/repositories/goalRepository';
import { assertValidGoal, type GoalValues } from '@/domain/goals/goalCalculator';
import { INITIAL_GOAL_DEFAULTS } from '@/services/logging/logQueryService';
import { assertLocalDate, toLocalDateString } from '@/utils/dates';

type Options = Readonly<{ createId?: () => string; now?: () => Date }>;

export class GoalService {
  private readonly createId: () => string;
  private readonly now: () => Date;
  constructor(private readonly database: DatabaseConnection, options: Options = {}) {
    this.createId = options.createId ?? randomUUID;
    this.now = options.now ?? (() => new Date());
  }

  async loadForDate(date: string): Promise<GoalValues> {
    assertLocalDate(date);
    const record = await new GoalRepository(this.database).findForDate(date);
    return record === null ? INITIAL_GOAL_DEFAULTS : {
      calorieTarget: record.calorie_target,
      proteinMinimumG: record.protein_minimum_g,
      calorieTolerancePercent: record.calorie_tolerance_percent,
    };
  }

  async loadToday(): Promise<GoalValues> {
    return this.loadForDate(toLocalDateString(this.now()));
  }

  async saveToday(values: GoalValues): Promise<GoalValues> {
    assertValidGoal(values);
    const effectiveDate = toLocalDateString(this.now());
    const timestamp = this.now().toISOString();
    const repository = new GoalRepository(this.database);
    const existing = await repository.findByEffectiveDate(effectiveDate);
    await repository.upsert({
      id: existing?.id ?? this.createId(),
      effective_date: effectiveDate,
      calorie_target: values.calorieTarget,
      protein_minimum_g: values.proteinMinimumG,
      calorie_tolerance_percent: values.calorieTolerancePercent,
      created_at: existing?.created_at ?? timestamp,
      updated_at: timestamp,
    });
    return values;
  }
}
