import type { DatabaseConnection } from '../types';

export const measurementPreferencesMigration = {
  version: 7,
  name: 'measurement_preferences',
  async up(database: DatabaseConnection): Promise<void> {
    await database.execAsync(`
      CREATE TABLE app_preferences (
        id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
        measurement_system TEXT NOT NULL DEFAULT 'grams'
          CHECK (measurement_system IN ('grams', 'freedom'))
      );

      INSERT INTO app_preferences (id, measurement_system)
      VALUES (1, 'grams');
    `);
  },
} as const;
