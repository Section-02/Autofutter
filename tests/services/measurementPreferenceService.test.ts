import { initializeDatabase } from '../../src/data/database/database';
import { MeasurementPreferenceService } from '../../src/services/settings/measurementPreferenceService';
import { TestDatabase } from '../database/testDatabase';

describe('MeasurementPreferenceService', () => {
  let database: TestDatabase;

  beforeEach(async () => {
    database = new TestDatabase();
    await initializeDatabase(database);
  });

  afterEach(() => database.close());

  it('defaults to grams and persists Freedom Units', async () => {
    const service = new MeasurementPreferenceService(database);
    await expect(service.load()).resolves.toBe('grams');

    await service.save('freedom');

    await expect(service.load()).resolves.toBe('freedom');
  });

  it('enforces valid measurement systems at the database boundary', async () => {
    await expect(database.runAsync(
      "UPDATE app_preferences SET measurement_system = 'invalid' WHERE id = 1;",
    )).rejects.toThrow();
  });
});
