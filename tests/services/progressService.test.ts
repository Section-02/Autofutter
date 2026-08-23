import { initializeDatabase } from '../../src/data/database/database';
import { GoalRepository } from '../../src/data/repositories/goalRepository';
import { LogDayCompletionRepository } from '../../src/data/repositories/logDayCompletionRepository';
import { ProgressService } from '../../src/services/progress/progressService';
import { WeightService } from '../../src/services/progress/weightService';
import { TestDatabase } from '../database/testDatabase';

const now = new Date(2026, 7, 22, 17, 0, 0);
const timestamp = now.toISOString();

describe('ProgressService', () => {
  let database: TestDatabase;
  beforeEach(async () => { database = new TestDatabase(); await initializeDatabase(database); });
  afterEach(() => database.close());

  it('returns permanent weight summary and range-filtered actual measurements', async () => {
    let id = 0;
    const weights = new WeightService(database, { createId: () => `weight-${++id}`, now: () => now });
    await weights.save({ date: '2026-04-01', weightLb: 305 });
    await weights.save({ date: '2026-07-20', weightLb: 290.2 });
    await weights.save({ date: '2026-08-22', weightLb: 286.4 });

    const data = await new ProgressService(database, { now: () => now }).load('1M');
    expect(data.startDate).toBe('2026-07-22');
    expect(data.weights.map(({ date }) => date)).toEqual(['2026-08-22']);
    expect(data.weightSummary.starting).toBe(305);
    expect(data.weightSummary.current).toBe(286.4);
    expect(data.weightSummary.totalChange).toBeCloseTo(-18.6, 10);
  });

  it('includes only ended calorie days and preserves historical effective goal ranges', async () => {
    await database.runAsync(
      `INSERT INTO daily_nutrition_summaries
       (date, calories, protein_g, fat_g, carbs_g, sodium_mg, cholesterol_mg, has_partial_nutrition, updated_at)
       VALUES (?, ?, 0, 0, 0, 0, 0, 0, ?), (?, ?, 0, 0, 0, 0, 0, 0, ?), (?, ?, 0, 0, 0, 0, 0, 0, ?);`,
      '2026-08-19', 1950, timestamp,
      '2026-08-21', 2050, timestamp,
      '2026-08-22', 2100, timestamp,
    );
    const goals = new GoalRepository(database);
    await goals.upsert({ id: 'goal-1', effective_date: '2026-08-01', calorie_target: 2000, protein_minimum_g: 160, calorie_tolerance_percent: 10, created_at: timestamp, updated_at: timestamp });
    await goals.upsert({ id: 'goal-2', effective_date: '2026-08-20', calorie_target: 3000, protein_minimum_g: 160, calorie_tolerance_percent: 5, created_at: timestamp, updated_at: timestamp });
    await new LogDayCompletionRepository(database).endDay({ date: '2026-08-22', ended_at: timestamp });

    const data = await new ProgressService(database, { now: () => now }).load('3M');
    expect(data.calories).toEqual([
      { date: '2026-08-19', calories: 1950, target: 2000, lower: 1800, upper: 2200, hasPartialNutrition: false },
      { date: '2026-08-21', calories: 2050, target: 3000, lower: 2850, upper: 3150, hasPartialNutrition: false },
      { date: '2026-08-22', calories: 2100, target: 3000, lower: 2850, upper: 3150, hasPartialNutrition: false },
    ]);
    expect(data.goals.map(({ effectiveDate, target }) => ({ effectiveDate, target }))).toEqual([
      { effectiveDate: '2026-08-01', target: 2000 },
      { effectiveDate: '2026-08-20', target: 3000 },
    ]);
  });

  it('creates a zero-calorie point for a manually ended fasting day', async () => {
    await new LogDayCompletionRepository(database).endDay({ date: '2026-08-22', ended_at: timestamp });
    const data = await new ProgressService(database, { now: () => now }).load('3M');
    expect(data.calories).toEqual([
      { date: '2026-08-22', calories: 0, target: 2000, lower: 1800, upper: 2200, hasPartialNutrition: false },
    ]);
  });
});
