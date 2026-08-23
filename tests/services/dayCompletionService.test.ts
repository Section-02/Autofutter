import { initializeDatabase } from '../../src/data/database/database';
import { LogDayCompletionRepository } from '../../src/data/repositories/logDayCompletionRepository';
import { isDayAutomaticallyEnded } from '../../src/domain/logging/dayCompletion';
import { DayCompletionService } from '../../src/services/logging/dayCompletionService';
import { LogQueryService } from '../../src/services/logging/logQueryService';
import { TestDatabase } from '../database/testDatabase';

describe('day completion', () => {
  let database: TestDatabase;
  beforeEach(async () => { database = new TestDatabase(); await initializeDatabase(database); });
  afterEach(() => database.close());

  it('persists a manually ended day and exposes it in the Log query', async () => {
    const now = new Date(2026, 7, 22, 20, 0, 0);
    await new DayCompletionService(database, { now: () => now }).endDay('2026-08-22');

    await expect(new LogDayCompletionRepository(database).findByDate('2026-08-22'))
      .resolves.toMatchObject({ date: '2026-08-22', ended_at: now.toISOString() });
    await expect(new LogQueryService(database, { now: () => now }).loadDay('2026-08-22'))
      .resolves.toMatchObject({ dayEnded: true, dayEndedAutomatically: false });
  });

  it('automatically ends a day at 2 a.m. the following local day', () => {
    expect(isDayAutomaticallyEnded('2026-08-22', new Date(2026, 7, 23, 1, 59, 59))).toBe(false);
    expect(isDayAutomaticallyEnded('2026-08-22', new Date(2026, 7, 23, 2, 0, 0))).toBe(true);
  });

  it('rejects ending a future day', async () => {
    const service = new DayCompletionService(database, { now: () => new Date(2026, 7, 22, 20) });
    await expect(service.endDay('2026-08-23')).rejects.toThrow('Future days cannot be ended.');
  });
});
