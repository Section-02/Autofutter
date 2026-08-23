import { initializeDatabase } from '../../src/data/database/database';
import { GoalRepository } from '../../src/data/repositories/goalRepository';
import { GoalService } from '../../src/services/goals/goalService';
import { LogQueryService } from '../../src/services/logging/logQueryService';
import { TestDatabase } from '../database/testDatabase';

describe('GoalService', () => {
  let database: TestDatabase;
  beforeEach(async () => { database = new TestDatabase(); await initializeDatabase(database); });
  afterEach(() => database.close());

  it('keeps prior days on their historical goal and applies newer goals forward', async () => {
    await new GoalService(database, { createId: () => 'goal-one', now: () => new Date('2026-08-20T18:00:00Z') }).saveToday({ calorieTarget: 2000, proteinMinimumG: 160, calorieTolerancePercent: 10 });
    await new GoalService(database, { createId: () => 'goal-two', now: () => new Date('2026-08-22T18:00:00Z') }).saveToday({ calorieTarget: 1800, proteinMinimumG: 150, calorieTolerancePercent: 12 });

    await expect(new LogQueryService(database).loadDay('2026-08-21')).resolves.toMatchObject({ goal: { calorieTarget: 2000, proteinMinimumG: 160, calorieTolerancePercent: 10 } });
    await expect(new LogQueryService(database).loadDay('2026-08-22')).resolves.toMatchObject({ goal: { calorieTarget: 1800, proteinMinimumG: 150, calorieTolerancePercent: 12 } });
    await expect(new LogQueryService(database).loadDay('2026-08-30')).resolves.toMatchObject({ goal: { calorieTarget: 1800 } });
  });

  it('replaces same-day goal values without creating another effective date', async () => {
    const service = new GoalService(database, { createId: () => 'goal-id', now: () => new Date('2026-08-22T18:00:00Z') });
    await service.saveToday({ calorieTarget: 2000, proteinMinimumG: 160, calorieTolerancePercent: 10 });
    await service.saveToday({ calorieTarget: 1900, proteinMinimumG: 155, calorieTolerancePercent: 11 });
    const record = await new GoalRepository(database).findByEffectiveDate('2026-08-22');
    expect(record).toMatchObject({ id: 'goal-id', calorie_target: 1900, protein_minimum_g: 155, calorie_tolerance_percent: 11 });
    const rows = await database.getAllAsync('SELECT * FROM nutrition_goals;');
    expect(rows).toHaveLength(1);
  });
});
