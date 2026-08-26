import type { DatabaseConnection } from '@/data/database/types';
import { AppPreferenceRepository } from '@/data/repositories/appPreferenceRepository';
import type { MeasurementSystem } from '@/domain/measurements/measurementSystem';

export class MeasurementPreferenceService {
  private readonly repository: AppPreferenceRepository;

  constructor(database: DatabaseConnection) {
    this.repository = new AppPreferenceRepository(database);
  }

  load(): Promise<MeasurementSystem> {
    return this.repository.getMeasurementSystem();
  }

  save(system: MeasurementSystem): Promise<void> {
    return this.repository.setMeasurementSystem(system);
  }
}
