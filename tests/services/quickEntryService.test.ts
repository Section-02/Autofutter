import { initializeDatabase } from '../../src/data/database/database';
import { DailySummaryRepository } from '../../src/data/repositories/dailySummaryRepository';
import { FoodLogRepository } from '../../src/data/repositories/foodLogRepository';
import { QuickEntryService } from '../../src/services/logging/quickEntryService';
import { TestDatabase } from '../database/testDatabase';

const now = new Date('2026-08-22T20:00:00.000Z');

describe('QuickEntryService', () => {
  let database: TestDatabase;
  let service: QuickEntryService;
  beforeEach(async () => {
    database = new TestDatabase();
    await initializeDatabase(database);
    service = new QuickEntryService(database, { createId: () => 'quick-id', now: () => now });
  });
  afterEach(() => database.close());

  it('logs partial estimated nutrition, rounds upward, and marks the day partial', async () => {
    const entry = await service.add({
      name: '  Burger and fries  ',
      logDate: '2026-08-22',
      nutrition: { calories: 1150.01, proteinG: 42.2, fatG: null, carbsG: null, sodiumMg: 900, cholesterolMg: null },
      isEstimated: true,
    });
    expect(entry).toMatchObject({
      entry_type: 'quick', display_name_snapshot: 'Burger and fries', amount_g: null,
      calories: 1151, protein_g: 43, fat_g: null, is_estimated: 1,
    });
    await expect(new DailySummaryRepository(database).findByDate('2026-08-22')).resolves.toMatchObject({
      calories: 1151, protein_g: 43, fat_g: null, has_partial_nutrition: 1,
    });
  });

  it('edits Quick Entry snapshots and recalculates a complete daily summary', async () => {
    await service.add({
      name: 'Dinner', logDate: '2026-08-22',
      nutrition: { calories: 500, proteinG: null, fatG: null, carbsG: null, sodiumMg: null, cholesterolMg: null },
      isEstimated: true,
    });
    const updated = await service.update('quick-id', {
      name: 'Dinner corrected', logDate: '2026-08-22',
      nutrition: { calories: 480, proteinG: 20, fatG: 15, carbsG: 50, sodiumMg: 700, cholesterolMg: 40 },
      isEstimated: false,
    });
    expect(updated).toMatchObject({ display_name_snapshot: 'Dinner corrected', is_estimated: 0 });
    await expect(new DailySummaryRepository(database).findByDate('2026-08-22')).resolves.toMatchObject({
      calories: 480, protein_g: 20, has_partial_nutrition: 0,
    });
    await expect(new FoodLogRepository(database).findById('quick-id')).resolves.toMatchObject({
      display_name_snapshot: 'Dinner corrected', calories: 480,
    });
  });

  it('keeps known nutrient totals when another entry is missing those nutrients', async () => {
    await service.add({
      name: 'Known lunch', logDate: '2026-08-22',
      nutrition: { calories: 400, proteinG: 30, fatG: 12, carbsG: 25, sodiumMg: 500, cholesterolMg: 20 },
      isEstimated: false,
    });
    const anotherService = new QuickEntryService(database, { createId: () => 'quick-id-2', now: () => now });
    await anotherService.add({
      name: 'Calories only', logDate: '2026-08-22',
      nutrition: { calories: 600, proteinG: null, fatG: null, carbsG: null, sodiumMg: null, cholesterolMg: null },
      isEstimated: true,
    });

    await expect(new DailySummaryRepository(database).findByDate('2026-08-22')).resolves.toMatchObject({
      calories: 1000, protein_g: 30, fat_g: 12, carbs_g: 25,
      sodium_mg: 500, cholesterol_mg: 20, has_partial_nutrition: 1,
    });
  });

  it('requires name and calories and rejects future dates', async () => {
    const base = { logDate: '2026-08-22', nutrition: { calories: 10, proteinG: null, fatG: null, carbsG: null, sodiumMg: null, cholesterolMg: null }, isEstimated: false };
    await expect(service.add({ ...base, name: '' })).rejects.toThrow('Name is required.');
    await expect(service.add({ ...base, name: 'Meal', nutrition: { ...base.nutrition, calories: Number.NaN } })).rejects.toThrow('Calories must be zero or greater.');
    await expect(service.add({ ...base, name: 'Meal', logDate: '2026-08-23' })).rejects.toThrow('Future logging is not supported.');
  });
});
