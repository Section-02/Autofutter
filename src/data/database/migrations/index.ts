import type { DatabaseConnection } from '../types';
import { initialSchemaMigration } from './001_initial_schema';
import { logNutritionBasisMigration } from './002_log_nutrition_basis';
import { partialNutritionTotalsMigration } from './003_partial_nutrition_totals';
import { logDayCompletionsMigration } from './004_log_day_completions';

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
];
