import type { DatabaseConnection } from '../types';
import { initialSchemaMigration } from './001_initial_schema';
import { logNutritionBasisMigration } from './002_log_nutrition_basis';
import { partialNutritionTotalsMigration } from './003_partial_nutrition_totals';
import { logDayCompletionsMigration } from './004_log_day_completions';
import { retentionStateMigration } from './005_retention_state';
import { standardFoodPortionsMigration } from './006_standard_food_portions';
import { measurementPreferencesMigration } from './007_measurement_preferences';
import { foodPortionConversionsMigration } from './008_food_portion_conversions';

export type Migration = {
  version: number;
  name: string;
  up(database: DatabaseConnection): Promise<void>;
};

export const migrations: readonly Migration[] = [
  initialSchemaMigration,
  logNutritionBasisMigration,
  partialNutritionTotalsMigration,
  logDayCompletionsMigration,
  retentionStateMigration,
  standardFoodPortionsMigration,
  measurementPreferencesMigration,
  foodPortionConversionsMigration,
];
