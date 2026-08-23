import { initializeDatabase } from '../../src/data/database/database';
import { WeightRepository } from '../../src/data/repositories/weightRepository';
import { WeightService } from '../../src/services/progress/weightService';
import { TestDatabase } from '../database/testDatabase';

const now = new Date(2026, 7, 22, 18, 0, 0);

describe('WeightService', () => {
  let database: TestDatabase;
  let nextId: number;
  let service: WeightService;
  beforeEach(async () => {
    database = new TestDatabase();
    await initializeDatabase(database);
    nextId = 0;
    service = new WeightService(database, { createId: () => `weight-${++nextId}`, now: () => now });
  });
  afterEach(() => database.close());

  it('creates weigh-ins and replaces the value for the same calendar date', async () => {
    const first = await service.save({ date: '2026-08-22', weightLb: 286.4 });
    const replacement = await service.save({ date: '2026-08-22', weightLb: 285.9 });
    expect(replacement).toMatchObject({ id: first.id, date: '2026-08-22', weight_lb: 285.9 });
    await expect(new WeightRepository(database).listAll()).resolves.toHaveLength(1);
  });

  it('edits and permanently deletes a weigh-in', async () => {
    const record = await service.save({ date: '2026-08-20', weightLb: 287.1 });
    await expect(service.update(record.id, { date: '2026-08-21', weightLb: 286.8 }))
      .resolves.toMatchObject({ date: '2026-08-21', weight_lb: 286.8 });
    await service.delete(record.id);
    await expect(new WeightRepository(database).findById(record.id)).resolves.toBeNull();
  });

  it('rejects nonpositive, malformed, future, and duplicate edit dates', async () => {
    await expect(service.save({ date: '2026-08-22', weightLb: 0 })).rejects.toThrow('greater than zero');
    await expect(service.save({ date: '2026-08-22', weightLb: Number.NaN })).rejects.toThrow('greater than zero');
    await expect(service.save({ date: '2026-08-23', weightLb: 286 })).rejects.toThrow('Future');
    const first = await service.save({ date: '2026-08-20', weightLb: 287 });
    await service.save({ date: '2026-08-21', weightLb: 286 });
    await expect(service.update(first.id, { date: '2026-08-21', weightLb: 285 }))
      .rejects.toThrow('already exists');
  });
});
