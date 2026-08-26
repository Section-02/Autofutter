import type { DatabaseConnection } from '@/data/database/types';
import type { MeasurementSystem } from '@/domain/measurements/measurementSystem';

export class AppPreferenceRepository {
  constructor(private readonly database: DatabaseConnection) {}

  async getMeasurementSystem(): Promise<MeasurementSystem> {
    const row = await this.database.getFirstAsync<{ measurement_system: MeasurementSystem }>(
      'SELECT measurement_system FROM app_preferences WHERE id = 1;',
    );
    return row?.measurement_system ?? 'grams';
  }

  async setMeasurementSystem(system: MeasurementSystem): Promise<void> {
    await this.database.runAsync(
      'UPDATE app_preferences SET measurement_system = ? WHERE id = 1;',
      system,
    );
  }
}
